<?php declare(strict_types=1);
/**
 * Tine 2.0
 *
 * @package     Tinebase
 * @subpackage  Auth
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @copyright   Copyright (c) 2021 Metaways Infosystems GmbH (http://www.metaways.de)
 * @author      Paul Mehrer <p.mehrer@metaways.de>
 */

/**
 * WebAuthn as SecondFactor Auth Adapter
 *
 * @package     Tinebase
 * @subpackage  Auth
 */
class Tinebase_Auth_MFA_WebAuthnAdapter implements Tinebase_Auth_MFA_AdapterInterface
{
    protected $_mfaId;

    public function __construct(Tinebase_Record_Interface $_config, string $id)
    {
        $this->_mfaId = $id;
    }

    public function sendOut(Tinebase_Model_MFA_UserConfig $_userCfg): bool
    {
        return true;
    }

    public function validate($_data, Tinebase_Model_MFA_UserConfig $_userCfg): bool
    {
        try {
            Tinebase_Auth_Webauthn::webAuthnAuthenticate($_data);
        } catch (Exception $e) {
            if (Tinebase_Core::isLogLevel(Zend_Log::INFO)) Tinebase_Core::getLogger()->info(__METHOD__ . '::' . __LINE__
                . ' webauthn mfa validation failed');
            return false;
        }

        return true;
    }
}
