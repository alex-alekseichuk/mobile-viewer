<?php
require '../config.php';

date_default_timezone_set('Europe/Amsterdam');

// receive feedback as json
$request = json_decode(file_get_contents('php://input'), true);

// compose the headers
$headers = "Content-type: text/plain\nX-Mailer: PHP/" . phpversion() . "\n";
$headers .= "From: " . FEEDBACK_EMAIL . "\n";
if ($request['email'])
    $headers .= "Reply-To: " . $request['email'] . "\n";

// compose message
$message = '';
if ($request['name'])
    $message .= $request['name'];
if ($request['email']) {
    $message .= ' <' . $request['email'] . '>';
    $headers .= "Cc: " . $request['email'] . "\n";
}
$message .= "\n";

// add type to message
if ($request['type'])
{
    $iType = (int)$request['type'] - 1;
    $types = array('arbeidsrecht', 'familierecht/echtscheiding', 'civiel recht', 'sociaal recht', 'huurrecht', 'bestuursrecht', 'strafrecht', 'anders');
    if ($iType >= 0 && $iType < count($types))
    {
        $message .= $types[$iType] . "\n";
    }
}

// add the question to message
$message .= "\n" . $request['question'];

@mail(FEEDBACK_EMAIL, 'uw vraag aan Advocaten.nl', $message, $headers);

