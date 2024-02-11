<?php
require '../config.php';
require '../vendor/autoload.php';

date_default_timezone_set('Europe/Amsterdam');

// Prepare app
$app = new \Slim\Slim(array(
    'templates.path' => '../templates',
    'log.level' => 4,
    'log.enabled' => true,
    'log.writer' => new \Slim\Extras\Log\DateTimeFileWriter(array(
        'path' => '../logs',
        'name_format' => 'y-m-d'
    )),
    'deployDir' => '../update/'
));

// Prepare view
\Slim\Extras\Views\Twig::$twigOptions = array(
    'charset' => 'utf-8',
    'cache' => realpath('../templates/cache'),
    'auto_reload' => true,
    'strict_variables' => false,
    'autoescape' => true
);
$app->view(new \Slim\Extras\Views\Twig());

// host page
$app->get('/', function () use ($app) {
    $app->render('index.html');
});

// php info
//$app->get('/info', function () {
//    phpinfo();
//    exit();
//});

// get the node + items
$app->get('/node(/(:id))', function ($id = 0) use ($app) {
    $model = new Cms\Model();
    if (0 == $id)
    {
        $node = $model->loadRootNode();
    } else {
        $node = $model->loadNode($id);
    }
    if (!$node)
    {
        replyError($app->response(), 404, "No such node.");
        return;
    }
    $model->loadNodeAddins($node);
    jsonReplyNode($app->response(), $node);
});

// insert new node
$app->post('/node', function() use ($app) {
    $model = new Cms\Model();
    $request = json_decode($app->request()->getBody(), true);
    if (array_key_exists('path', $request))
    {
        $path = $request["path"];
        $ids = explode(',', $path);
        $parentId = $ids[count($ids) - 1];
        $parentNode = $model->loadNode($parentId);
        if (!$parentNode)
        {
            replyError($app->response(), 404, "No such node.");
            return;
        }
        //$path = $parentNode->path ? $parentNode->path . ',' . $parentNode->id : $parentNode->id;
    } else {
        $rootNode = $model->loadRootNode();
        if ($rootNode)
        {
            replyError($app->response(), 405, "Root node already exists.");
            return;
        }
        //$path = '';
        $request['path'] = '';
    }
    //$request["path"] = $path;
    $node = $model->insertNode($request);
    if (!$node)
    {
        replyError($app->response(), 500, "Can't insert new node.");
        return;
    }
    $model->loadNodeAddins($node);
    jsonReplyNode($app->response(), $node);
});

// update the node
$app->put('/node/:id', function ($id) use ($app) {
    $model = new Cms\Model();
    $node = $model->loadNode($id);
    if (!$node)
    {
        replyError($app->response(), 404, "No such node.");
        return;
    }
    $request = json_decode($app->request()->getBody(), true);
    $model->updateNode($node, $request);
    $model->loadNodeAddins($node);
    jsonReplyNode($app->response(), $node);
});

// delete the node
$app->delete('/node/:id', function ($id) use ($app) {
    $model = new Cms\Model();
    $node = $model->loadNode($id);
    if (!$node)
    {
        replyError($app->response(), 404, "No such node.");
        return;
    }
    $model->deleteNode($node);
    jsonReply($app->response(), new stdClass);
});

// update ranks of node items (sub-node)
$app->put('/items/order', function () use ($app) {
    $model = new Cms\Model();
    $id = $app->request()->getBody();
    $model->updateItemsOrder($id);
    replyOk($app->response());
});

// upload image, process it and return base64-encoded string
$app->post('/embedImage', function () use ($app) {
    $file = $_FILES["imageName"]['tmp_name'];
    if (is_uploaded_file($file))
    {
        $contents = file_get_contents($file);
        $base64 = base64_encode($contents);
        $app->response()->body('<div id="image">data:' . $_FILES["imageName"]['type'] . ';base64,' . $base64 . '</div>');
        return;
    }
    replyError($app->response(), 406, "Can't process this file");
});

// deploy: create version.txt and structure.json
$app->get('/build', function () use ($app) {
    $model = new Cms\Model();
    //$structFile = $app->config('deployDir') . 'structure.json';

    if ($model->deploy($app->config('deployDir')))
    {

        // save the version-marker file
        @file_put_contents($app->config('deployDir') . 'version.txt', date("Y-m-d H:i:s"));

        replyOk($app->response());
        return;
    }
    replyError($app->response(), 500, "Can't save structure.");


//    // compose the structure into single JSON
//    if ($json = $model->export())
//    {
//        // save plain JSON structure
//        @file_put_contents($structFile, $json);
//
//        // save gzipped version
//        $fp = @gzopen($structFile . ".gz", "w");
//        if ($fp) {
//            @gzwrite($fp, $json);
//            @gzclose($fp);
//
//            // save the version-marker file
//            @file_put_contents($app->config('deployDir') . 'version.txt', date("Y-m-d H:i:s"));
//
//            replyOk($app->response());
//            return;
//        }
//    }
//    replyError($app->response(), 500, "Can't save structure.");
});

// get pages array for link between pages inside the structure
$app->get('/pages', function () use ($app) {
    $model = new Cms\Model();
    jsonReply($app->response(), $model->loadAllNodesTitle());
});

// Run app
$app->run();

function jsonReply($response, $jsonReply) {
    $response['Content-Type'] = 'application/json';
    $response->body(json_encode($jsonReply));
}
function jsonReplyNode($response, $node) {
    jsonReply($response, array(
        "id" => $node->id,
        "title" => $node->title,
        "text" => $node->text,
        "tags" => $node->tags,
        "linkId" => $node->linkId,
        "type" => $node->type,
        "path" => $node->path,
        "breadcrumbs" => $node->breadcrumbs,
        "items" => array_map(
            function($node){
                return array(
                    "id" => $node->id,
                    "title" => $node->title,
                    "rank" => $node->rank
                );
            }, $node->items ? $node->items : array())
    ));
}
function jsonReplyNodeItem($response, $node) {
    jsonReply($response, array(
        "id" => $node->id,
        "title" => $node->title,
        "rank" => $node->rank
    ));
}
function replyError($response, $status, $message) {
    $response['Content-Type'] = 'plain/text';
    $response->status($status);
    $response->body($message);
}
function replyOk($response) {
    $response['Content-Type'] = 'plain/text';
    $response->body('Ok');
}

