<?php
/**
 * Tine 2.0
 * 
 * @package     Felamimail
 * @subpackage  Exception
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @copyright   Copyright (c) 2010 Metaways Infosystems GmbH (http://www.metaways.de)
 * @author      Philipp Schuele <p.schuele@metaways.de>
 *
 */

/**
 * Folder Not Found Exception
 * 
 * @package     Felamimail
 * @subpackage  Exception
 */
class Felamimail_Exception_IMAPFolderNotFound extends Felamimail_Exception_IMAP
{
    /**
     * don't log this to sentry in Tinebase_Exception::log()
     *
     * @var bool
     */
    protected $_logToSentry = false;

    /**
     * construct
     * 
     * @param string $_message
     * @param integer $_code
     */
    public function __construct($_message = 'IMAP folder not found.', $_code = 913)
    {
        parent::__construct($_message, $_code);
    }
}
