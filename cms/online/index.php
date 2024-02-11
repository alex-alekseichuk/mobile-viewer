<?php
require '../config.php';
require '../vendor/autoload.php';

date_default_timezone_set('Europe/Amsterdam');

// Prepare app
$app = new \Slim\Slim(array(
    'templates.path' => '../templates/online',
    'log.level' => 4,
    'log.enabled' => true,
    'log.writer' => new \Slim\Extras\Log\DateTimeFileWriter(array(
        'path' => '../logs/online',
        'name_format' => 'y-m-d'
    )),
    'deployDir' => '../update/'
));

$app->add(new \Slim\Middleware\SessionCookie());

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
    //$app->render('index.html');
    $app->redirect('node/0', 303); // See Other
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
        $app->redirect('0', 301); // Moved Permanently
        return;
    }

    if ('link' == $node->type) {
        $app->redirect($node->linkId, 301); // Moved Permanently
        return;
    }

    $node->items = $model->loadNodeItems($node);

    $bcString = '';
    $bc = array();

    if (!$node->path) {
        $bcString = '';
        $bc = array();
    } else {
        if (isset($_SESSION['bc'])) {
            $bcString = $_SESSION['bc'];
            $bc = explode(',', $bcString);
            $i = array_search($node->id, $bc);
            if (FALSE !== $i) {
                if ($i > 0) {
                    $bc = array_slice($bc, 0, $i);
                    $bcString = implode(',', $bc);
                } else {
                    $bcString = '';
                    $bc = array();
                }
            }
        } else {
            $bcString = $model->loadRootNode()->id;
            $bc = array($bcString);
        }

    }
    $_SESSION['bc'] = $bcString ? ($bcString . ',' . $node->id) : $node->id;

    $breadcrumbs = $bc ? $model->loadBreadcrumbs($bc) : null;
//    $breadcrumbs = null;

    // fix links to nodes
    $node->text = preg_replace("/\"#node(\\d+)\"/", "\"\\1\"", $node->text);
    $node->text = preg_replace("/\"#feedback\"/", "\"http://www.advocaten.nl/gratis-online-juridisch-advies/\"", $node->text);

    $data = array('node' => $node, 'breadcrumbs' => $breadcrumbs);
    switch ($node->type) {
        case 'menu':
        case 'list':
            $app->render('menu.html', $data);
            break;
        default: // content
            $app->render('content.html', $data);
            break;
    }

});

// Run app
$app->run();

