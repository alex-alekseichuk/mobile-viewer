<?php
/**
 * Model of the CMS
 */
namespace Cms;
use \ORM as ORM;


class Model
{
    public function __construct()
    {
        ORM::configure(array(
            'connection_string' => DB_CONN,
            'username' => DB_USER,
            'password' => DB_PASSWORD
        ));
    }

    public function loadRootNode()
    {
        return ORM::for_table('node')
            ->select('node.*')
            ->where_equal('node.path', '')
            ->find_one();
    }
    public function loadNode($id)
    {
        return ORM::for_table('node')
            ->select('node.*')
            ->where_equal('id', $id)
            ->find_one();
    }
    public function loadNodeAddins(&$node)
    {
        $node->items = $this->loadNodeItems($node);
        $node->breadcrumbs = $this->_loadNodeBreadcrumbs($node);
    }
    public function loadNodeItems($node)
    {
        $rs = ORM::for_table('node')
            ->select('node.*')
            ->where_equal('node.path', $node->path ? $node->path . ',' . $node->id : $node->id)
            ->order_by_asc('rank')
            ->find_many();
        array_walk($rs, function($row) {
            $row['id'] = (int)$row['id'];
            $row['linkId'] = (int)$row['linkId'];
            $row['rank'] = (int)$row['rank'];
        });
        return $rs;
    }
    protected function _loadNodeBreadcrumbs($node)
    {
        if (!$node->path)
            return null;
        $a_path = explode(',', $node->path);
        return $this->loadBreadcrumbs($a_path);

//        return array_reduce(
//            ORM::for_table('node')
//                ->select('node.id')->select('node.title')
//                ->where_in('node.id', $a_path)
//                ->order_by_asc('rank')
//                ->find_many(),
//            function($a, $v) {
//                $a[$v['id']] = $v['title'];
//                return $a;
//            },
//            array()
//        );
    }

    public function loadBreadcrumbs($bc)
    {
        return array_reduce(
            ORM::for_table('node')
                ->select('node.id')->select('node.title')
                ->where_in('node.id', $bc)
                //->order_by_asc('rank')
                ->find_many(),
            function($a, $v) {
                $a[$v['id']] = $v['title'];
                return $a;
            },
            array()
        );
    }

    public function loadAllNodesTitle()
    {
        return array_map(
            function($a) {
                return array('id' => $a['id'], 'title' => $a['title']);
            },
            ORM::for_table('node')
                ->select('node.id')->select('node.title')
                ->find_many(),
            array()
        );
    }

    public function insertNode($request)
    {
        $node = ORM::for_table('node')->create();
        $node->title = $request['title'];
        $node->text = $request['text'];
        $node->tags = $request['tags'];
        $node->type = $request['type'];
        $node->linkId = $request['linkId'];
        $node->path = $request['path'];
        $node->rank = 1 + ORM::for_table('node')->where_equal('path', $request['path'])->max('rank');
        $node->save();
        return $node;
    }
    public function updateNode($node, $request)
    {
        $node->title = $request['title'];
        $node->text = $request['text'];
        $node->tags = $request['tags'];
        $node->type = $request['type'];
        $node->linkId = $request['linkId'];
        $node->save();
        return $node;
    }
    public function deleteNode($node)
    {
        // get all sub-nodes
        $sub_nodes = ORM::for_table('node')
            ->select('node.*')
            ->where_equal('node.path', $node->path ? $node->path . ',' . $node->id : $node->id)
            ->order_by_asc('rank')
            ->find_many();

        // delete those sub-nodes recursively
        foreach ($sub_nodes as $sub_node)
        {
            $this->deleteNode($sub_node);
        }

        // delete this node
        $node->delete();
    }

    public function updateItemsOrder($ids) {
        $a_ids = explode(',', $ids);
        for ($i = 0; $i < count($a_ids); ++$i)
        {
            if ($node = $this->loadNode($a_ids[$i]))
            {
                $node->rank = $i;
                $node->save();
            }
        }
    }

    protected function _importNode($jsNode, $path = '', $rank = 0)
    {
        if (array_key_exists('title', $jsNode))
        {
            $node = ORM::for_table('node')->create();
            $node->id = $jsNode->id;
            $node->title = $jsNode->title;
            if (array_key_exists('text', $jsNode))
                $node->text = $jsNode->text;
            if (array_key_exists('tags', $jsNode) && is_array($jsNode->tags) && count($jsNode->tags) > 0)
                $node->tags = implode(',', $jsNode->tags);
            if (array_key_exists('type', $jsNode))
                $node->type = $jsNode->type;
            if (array_key_exists('linkId', $jsNode))
                $node->linkId = $jsNode->linkId;
            $node->rank = $rank;
            $node->path = $path;
            $node->save();
        }
        if (array_key_exists('nodes', $jsNode))
            foreach ($jsNode->nodes as $i => $jsChildNode)
            {
                $this->_importNode($jsChildNode,
                    '' !== $path ? $path . ',' . $node->id : $node->id,
                    $i);
            }
    }
    public function importFromFile($file)
    {
        if (!($json = @file_get_contents($file)))
            return false;
        if (!($structure = @json_decode($json)))
            return false;

        $db = ORM::get_db();
        $db->exec("DELETE FROM node;");

        $this->_importNode($structure);
        return true;
    }

    protected function _exportNode($nodes, $i, $path)
    {
        $node = $nodes[$i];
        $jsNode = array(
            'id' => $node->id,
            'title' => $node->title
        );
        if ($node->text)
            $jsNode['text'] = $node->text;
        if ($node->tags) {
            $jsNode['tags'] = array_filter(array_map(function($s)
            {
                return strtolower(trim($s));
            }, explode(',', $node->tags)), function($s)
            {
                return !empty($s);
            });
        }
        if ($node->type)
            $jsNode['type'] = $node->type;
        if ($node->linkId)
            $jsNode['linkId'] = $node->linkId;

        $path .= ($path ? ',' : '') . $node->id;
        $jsNodes = array();

        for ($n = count($nodes); $i < $n; ++$i)
        {
            $childNode = $nodes[$i];
            if ($path === $childNode->path) {
                array_push($jsNodes, $this->_exportNode($nodes, $i, $path));

            }
        }
        if (count($jsNodes) > 0)
            $jsNode['nodes'] = $jsNodes;

        return $jsNode;
    }
    public function export()
    {
        $nodes = ORM::for_table('node')
            ->select('node.*')
            ->order_by_expr('path, rank')
            ->find_many();

        $i = 0;
        $path = '';
        if (count($nodes) > 0)
        {
            $root = $this->_exportNode($nodes, $i, $path);
            if (!($json = @json_encode($root)))
                return false;
            return $json;
        }
        return false;
    }
    public function exportToFile($file)
    {
        if (!($json = $this->export()))
            return false;
        if (!@file_put_contents($file, $json))
            return false;
        return true;
    }

    protected $deployDir;
    protected $deployFiles;
    protected function _deployNode($nodes, $i, $path)
    {
        $node = $nodes[$i];
        $jsNode = array(
            'id' => $node->id,
            'title' => $node->title
        );
        if (('' === $node->type || 'menu' === $node->type || 'list' === $node->type) &&
            '<br/>' != $node->text && '' !== $node->text)
        {
            if (strlen($node->text) > 256) {
                $jsNode['text'] = true;
                @file_put_contents($this->deployDir . $node->id . '.html', $node->text);
                array_push($this->deployFiles, $node->id . '.html');
            } else {
                $jsNode['text'] = $node->text;
            }
        }
        if ($node->tags) {
            $jsNode['tags'] = array_filter(array_map(function($s)
            {
                return strtolower(trim($s));
            }, explode(',', $node->tags)), function($s)
            {
                return !empty($s);
            });
        }
        if ($node->type)
            $jsNode['type'] = $node->type;
        if ($node->linkId)
            $jsNode['linkId'] = $node->linkId;

        $path .= ($path ? ',' : '') . $node->id;
        $jsNodes = array();

        for ($n = count($nodes); $i < $n; ++$i)
        {
            $childNode = $nodes[$i];
            if ($path === $childNode->path) {
                array_push($jsNodes, $this->_deployNode($nodes, $i, $path));

            }
        }
        if (count($jsNodes) > 0)
            $jsNode['nodes'] = $jsNodes;

        return $jsNode;
    }
    public function deploy($deployDir)
    {
        $nodes = ORM::for_table('node')
            ->select('node.*')
            ->order_by_expr('path, rank')
            ->find_many();

        $i = 0;
        $path = '';
        if (count($nodes) <= 0)
            return false;
        $this->deployFiles = array();
        $this->deployDir = $deployDir;

        // construct the structure and save html files recursively
        $root = $this->_deployNode($nodes, $i, $path);
        if (!($json = @json_encode($root)))
            return false;

        // save plain JSON structure
        @file_put_contents($deployDir . 'structure.json', $json);
        array_push($this->deployFiles, 'structure.json');

        // zip the structure + html files
        $zipname = $deployDir . 'structure.zip';
        $zip = new \ZipArchive;
        $zip->open($zipname, \ZipArchive::CREATE);
        foreach ($this->deployFiles as $file) {
            $zip->addFile($deployDir . $file, $file);
        }
        $zip->close();

        return true;
    }


    public function saveFeedback($request)
    {
        $feedback = ORM::for_table('feedback')->create();
        $feedback->name= $request['name'];
        $feedback->email = $request['email'];
        $feedback->question = $request['question'];
        $feedback->type = $request['type'];
        $feedback->save();
    }
}
