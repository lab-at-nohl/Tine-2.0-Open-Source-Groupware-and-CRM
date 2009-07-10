<?php
/**
 * Tine 2.0
 *
 * @package     ActiveSync
 * @license     http://www.tine20.org/licenses/agpl-nonus.txt AGPL Version 1 (Non-US)
 *              NOTE: According to sec. 8 of the AFFERO GENERAL PUBLIC LICENSE (AGPL), 
 *              Version 1, the distribution of the Tine 2.0 ActiveSync module in or to the 
 *              United States of America is excluded from the scope of this license.
 * @copyright   Copyright (c) 2009 Metaways Infosystems GmbH (http://www.metaways.de)
 * @author      Cornelius Weiss <c.weiss@metaways.de>
 * @version     $Id$
 */

/**
 * controller events class
 * 
 * current problems:
 *   n tine evnets become one AS evnet as AS events house all exceptions
 *   one AS event becomes n tine events
 *
 * @package     ActiveSync
 */
class ActiveSync_Controller_Calendar extends ActiveSync_Controller_Abstract
{
    /**
     * attendee status
     */
    const ATTENDEE_STATUS_UNKNOWN       = 0;
    const ATTENDEE_STATUS_TENTATIVE     = 2;
    const ATTENDEE_STATUS_ACCEPTED      = 3;
    const ATTENDEE_STATUS_DECLINED      = 4;
    const ATTENDEE_STATUS_NOTRESPONDED  = 5;
    
    /**
     * attendee types
     */
    const ATTENDEE_TYPE_REQUIRED = 1;
    const ATTENDEE_TYPE_OPTIONAL = 2;
    const ATTENDEE_TYPE_RESOURCE = 3;
    
    /**
     * recur types
     */
    const RECUR_TYPE_DAILY          = 0;     // Recurs daily.
    const RECUR_TYPE_WEEKLY         = 1;     // Recurs weekly
    const RECUR_TYPE_MONTHLY        = 2;     // Recurs monthly
    const RECUR_TYPE_MONTHLY_DAYN   = 3;     // Recurs monthly on the nth day
    const RECUR_TYPE_YEARLY         = 5;     // Recurs yearly
    const RECUR_TYPE_YEARLY_DAYN    = 6;     // Recurs yearly on the nth day
    
    /**
     * day of week constants
     */
    const RECUR_DOW_SUNDAY      = 1;
    const RECUR_DOW_MONDAY      = 2;
    const RECUR_DOW_TUESDAY     = 4;
    const RECUR_DOW_WEDNESDAY   = 8;
    const RECUR_DOW_THURSDAY    = 16;
    const RECUR_DOW_FRIDAY      = 32;
    const RECUR_DOW_SATURDAY    = 64;
    
    /**
     * mapping of attendee status
     *
     * NOTE: not surjektive
     * @var array
     */
    protected $_attendeeStatusMapping = array(
        self::ATTENDEE_STATUS_UNKNOWN       => Calendar_Model_Attender::STATUS_NEEDSACTION,
        self::ATTENDEE_STATUS_TENTATIVE     => Calendar_Model_Attender::STATUS_TENTATIVE,
        self::ATTENDEE_STATUS_ACCEPTED      => Calendar_Model_Attender::STATUS_ACCEPTED,
        self::ATTENDEE_STATUS_DECLINED      => Calendar_Model_Attender::STATUS_DECLINED,
        self::ATTENDEE_STATUS_NOTRESPONDED  => Calendar_Model_Attender::STATUS_NEEDSACTION
    );
    
    /**
     * mapping of attendee types
     * 
     * NOTE: recources need extra handling!
     * @var array
     */
    protected $_attendeeTypeMapping = array(
        self::ATTENDEE_TYPE_REQUIRED => Calendar_Model_Attender::ROLE_REQUIRED,
        self::ATTENDEE_TYPE_OPTIONAL => Calendar_Model_Attender::ROLE_OPTIONAL,
        self::ATTENDEE_TYPE_RESOURCE => Calendar_Model_Attender::USERTYPE_RESOURCE
    );
    
    /**
     * mapping of recur types
     *
     * NOTE: not surjektive
     * @var array
     */
    protected $_recurTypeMapping = array(
        self::RECUR_TYPE_DAILY          => Calendar_Model_Rrule::FREQ_DAILY,
        self::RECUR_TYPE_WEEKLY         => Calendar_Model_Rrule::FREQ_WEEKLY,
        self::RECUR_TYPE_MONTHLY        => Calendar_Model_Rrule::FREQ_MONTHLY,
        self::RECUR_TYPE_MONTHLY_DAYN   => Calendar_Model_Rrule::FREQ_MONTHLY,
        self::RECUR_TYPE_YEARLY         => Calendar_Model_Rrule::FREQ_YEARLY,
        self::RECUR_TYPE_YEARLY_DAYN    => Calendar_Model_Rrule::FREQ_YEARLY,
    );
    
    /**
     * trivial mapping
     *
     * @var array
     */
    protected $_mapping = array(
        //'Timezone'          => 'timezone',
        'AllDayEvent'       => 'is_all_day_event',
        //'BusyStatus'        => 'transp',
        //'OrganizerName'     => 'organizer',
        //'OrganizerEmail'    => 'organizer',
        //'DtStamp'           => 'last_modified_time',  // not used outside from Tine 2.0
        'EndTime'           => 'dtend',
        'Location'          => 'location',
        //'Reminder'          => 'alarms',
        //'Sensitivity'       => 'class_id',
        'Subject'           => 'summary',
        'Body'              => 'description',
        'StartTime'         => 'dtstart',
        //'UID'               => 'uid',             // not used outside from Tine 2.0
        //'MeetingStatus'     => 'status_id',
        //'Attendees'         => 'attendee',
        //'Categories'        => 'tags',
        //'Recurrence'        => 'rrule',
        //'Exceptions'        => 'exdate',
    );
    
    protected $_timezoneUnpackString = 'lbias/a64standardName/vstandardYear/vstandardMonth/vstandardDayOfWeek/vstandardDay/vstandardHour/vstandardMinute/vstandardSecond/vstandardMilliseconds/lstandardBias/a64daylightName/vdaylightYear/vdaylightMonth/vdaylightDayOfWeek/vdaylightDay/vdaylightHour/vdaylightMinute/vdaylightSecond/vdaylightMilliseconds/ldaylightBias';
    
    
    /**
     * list of supported folders
     * @todo retrieve users real container
     * @var array
     */
    protected $_folders = array(array(
        'folderId'      => 'eventsroot',
        'parentId'      => 0,
        'displayName'   => 'Events',
        'type'          => ActiveSync_Command_FolderSync::FOLDERTYPE_CALENDAR
    ));
    
    /**
     * name of Tine 2.0 backend application
     * 
     * @var string
     */
    protected $_applicationName     = 'Calendar';
    
    /**
     * name of Tine 2.0 model to use
     * 
     * @var string
     */
    protected $_modelName           = 'Event';
    
    /**
     * type of the default folder
     *
     * @var int
     */
    protected $_defaultFolderType   = ActiveSync_Command_FolderSync::FOLDERTYPE_CALENDAR;
    
    /**
     * type of user created folders
     *
     * @var int
     */
    protected $_folderType          = ActiveSync_Command_FolderSync::FOLDERTYPE_CALENDAR_USER_CREATED;
    
    /**
     * append contact to xml parent node
     *
     * @todo handle BusyStatus
     * @todo handle TimeZone data
     * @param DOMDocument $_xmlDocument
     * @param DOMElement $_xmlNode
     * @param string $_serverId
     */
    public function appendXML(DOMDocument $_xmlDocument, DOMElement $_xmlNode, $_folderId, $_serverId)
    {
        $data = $this->_contentController->get($_serverId);
        
        Tinebase_Core::getLogger()->debug(__METHOD__ . '::' . __LINE__ . " calendar data " . print_r($data->toArray(), true));
        
        foreach($this->_mapping as $key => $value) {
            if(!empty($data->$value)) {
                switch($value) {
                    case 'dtend':
                    case 'dtstart':
                        $date = $data->$value->toString('yyyyMMddTHHmmss') . 'Z';
                        $_xmlNode->appendChild($_xmlDocument->createElementNS('uri:Calendar', $key, $date));
                        break;
                    default:
                        $_xmlNode->appendChild($_xmlDocument->createElementNS('uri:Calendar', $key, $data->$value));
                        break;
                }
            }
        }   
        
        if(!empty($data->rrule)) {
            Tinebase_Core::getLogger()->debug(__METHOD__ . '::' . __LINE__ . " calendar rrule " . $data->rrule);
            $rrule = Calendar_Model_Rrule::getRruleFromString($data->rrule);
            
            $recurrence = $_xmlNode->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'Recurrence'));
            // required fields
            switch($rrule->freq) {
                case Calendar_Model_Rrule::FREQ_DAILY:
                    $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'Type', self::RECUR_TYPE_DAILY));
                    break;
                    
                case Calendar_Model_Rrule::FREQ_WEEKLY:
                    $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'Type', self::RECUR_TYPE_WEEKLY));
                    $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'DayOfWeek', $this->_convertDayToBitMask($rrule->byday)));
                    break;
                    
                case Calendar_Model_Rrule::FREQ_MONTHLY:
                    if(!empty($rrule->bymonthday)) {
                        $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'Type', self::RECUR_TYPE_MONTHLY));

                        $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'DayOfMonth', $rrule->bymonthday));
                    } else {
                        $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'Type', self::RECUR_TYPE_MONTHLY_DAYN));

                        $weekOfMonth = (int) substr($rrule->byday, 0, -2);
                        $weekOfMonth = ($weekOfMonth == -1) ? 5 : $weekOfMonth; 
                        $dayOfWeek   = substr($rrule->byday, -2);
                        $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'WeekOfMonth', $weekOfMonth));
                        $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'DayOfWeek',   $this->_convertDayToBitMask($dayOfWeek)));
                    }
                    break;
                case Calendar_Model_Rrule::FREQ_YEARLY:
                    if(!empty($rrule->bymonthday)) {
                        $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'Type', self::RECUR_TYPE_YEARLY));
                        
                        $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'DayOfMonth', $rrule->bymonthday));
                        $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'MonthOfYear', $rrule->bymonth));
                    } else {
                        $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'Type', self::RECUR_TYPE_YEARLY_DAYN));

                        $weekOfMonth = (int) substr($rrule->byday, 0, -2);
                        $weekOfMonth = ($weekOfMonth == -1) ? 5 : $weekOfMonth; 
                        $dayOfWeek   = substr($rrule->byday, -2);
                        $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'WeekOfMonth', $weekOfMonth));
                        $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'DayOfWeek',   $this->_convertDayToBitMask($dayOfWeek)));
                        $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'MonthOfYear', $rrule->bymonth));
                    }
                    break;
            }
            
            #if ($rrule->freq != Calendar_Model_Rrule::FREQ_YEARLY) {
            #    $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'Interval', $rrule->interval));
            #}
            if ($rrule->freq == Calendar_Model_Rrule::FREQ_YEARLY) {
                $rrule->interval = 1;
            }
            $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'Interval', $rrule->interval));
            
            if($rrule->until instanceof Zend_Date) {
                $recurrence->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'Until', $rrule->until->toString('yyyyMMddTHHmmss') . 'Z'));
            }
                        
            //Occurences
        }
                
        $_xmlNode->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'Timezone', 'xP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAFAAEAAAAAAAAAxP///w=='));
        $_xmlNode->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'BusyStatus', 2));
        $_xmlNode->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'Sensitivity', 2));
        //$_xmlNode->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'MeetingStatus', 0));
        $_xmlNode->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'DtStamp', $data->creation_time->toString('yyyyMMddTHHmmss') . 'Z'));
        $_xmlNode->appendChild($_xmlDocument->createElementNS('uri:Calendar', 'UID', $data->getId()));
    }
    
    /**
     * convert string of days (TU,TH) to bitmask used by ActiveSync
     *  
     * @param $_days
     * @return int
     */
    protected function _convertDayToBitMask($_days)
    {
        $dayValues = array(
            Calendar_Model_Rrule::WDAY_SUNDAY       => self::RECUR_DOW_SUNDAY,
            Calendar_Model_Rrule::WDAY_MONDAY       => self::RECUR_DOW_MONDAY,
            Calendar_Model_Rrule::WDAY_TUESDAY      => self::RECUR_DOW_TUESDAY,
            Calendar_Model_Rrule::WDAY_WEDNESDAY    => self::RECUR_DOW_WEDNESDAY,
            Calendar_Model_Rrule::WDAY_THURSDAY     => self::RECUR_DOW_THURSDAY,
            Calendar_Model_Rrule::WDAY_FRIDAY       => self::RECUR_DOW_FRIDAY,
            Calendar_Model_Rrule::WDAY_SATURDAY     => self::RECUR_DOW_SATURDAY
        );
        $daysArray = explode(',', $_days);
        
        $result = 0;
        
        foreach($daysArray as $dayString) {
            $result = $result + $dayValues[$dayString];
        }
        
        return $result;
    }
        
    /**
     * convert contact from xml to Calendar_Model_Event
     *
     * @todo handle BusyStatus
     * @param SimpleXMLElement $_data
     * @return Calendar_Model_Event
     */
    protected function _toTineModel(SimpleXMLElement $_data, $_entry = null)
    {
        if($_entry instanceof Calendar_Model_Event) {
            $event = $_entry;
        } else {
            $event = new Calendar_Model_Event(array(), true);
        }
        
        $xmlData = $_data->children('uri:Calendar');

        foreach($this->_mapping as $fieldName => $value) {
            switch($value) {
                case 'dtend':
                case 'dtstart':
                    if(isset($xmlData->$fieldName)) {
                        $timeStamp = $this->_convertISOToTs((string)$xmlData->$fieldName);
                        $event->$value = new Zend_Date($timeStamp, NULL);
                    } else {
                        $event->$value = null;
                    }
                    break;
                default:
                    if(isset($xmlData->$fieldName)) {
                        $event->$value = (string)$xmlData->$fieldName;
                    } else {
                        $event->$value = null;
                    }
                    break;
            }
        }
        
        // decode timezone data
        if(isset($xmlData->Timezone)) {
            $timezoneData = $this->unpackTimezoneInfo((string)$xmlData->Timezone);
            Tinebase_Core::getLogger()->debug(__METHOD__ . '::' . __LINE__ . " timezone data " . print_r($timezoneData, true));
        }
        
        // handle attendees
        if(isset($xmlData->Attendees)) {
            foreach($xmlData->Attendees->Attendee as $attendee) {
                Tinebase_Core::getLogger()->debug(__METHOD__ . '::' . __LINE__ . " attendee email" . $attendee->Email);
                // search contact from addressbook using the emailaddress
                // $attender = new Calendar_Model_Attender($attenderData);
            }
        } else {
            $event->attendee = array();
        }
        
        // handle recurrence
        if(isset($xmlData->Recurrence) && isset($xmlData->Recurrence->Type)) {
            $rrule = new Calendar_Model_Rrule($rruleArray);
            
            switch((int)$xmlData->Recurrence->Type) {
                case self::RECUR_TYPE_DAILY:
                    $rrule->freq = Calendar_Model_Rrule::FREQ_DAILY;
                    break; 
                    
                case self::RECUR_TYPE_WEEKLY:
                    $rrule->freq = Calendar_Model_Rrule::FREQ_WEEKLY;
                    //byday
                    break;
                     
                case self::RECUR_TYPE_MONTHLY:
                    $rrule->freq = Calendar_Model_Rrule::FREQ_MONTHLY;
                    break;
                     
                case self::RECUR_TYPE_MONTHLY_DAYN:
                    $rrule->freq = Calendar_Model_Rrule::FREQ_MONTHLY;
                    break;
                     
                case self::RECUR_TYPE_YEARLY:
                    $rrule->freq = Calendar_Model_Rrule::FREQ_YEARLY;
                    break;
                     
                case self::RECUR_TYPE_YEARLY_DAYN:
                    $rrule->freq = Calendar_Model_Rrule::FREQ_YEARLY;
                    break; 
            }
            $rrule->interval = isset($xmlData->Recurrence->Interval) ? (int)$xmlData->Recurrence->Interval : 1;
            
            if(isset($xmlData->Recurrence->Until)) {
                $timeStamp = $this->_convertISOToTs((string)$xmlData->Recurrence->Until);
                $rrule->until = new Zend_Date($timeStamp, NULL);
            } else {
                $rrule->until = null;
            }            
            
            $event->rrule = $rrule;
        }
        
        // event should be valid now
        $event->isValid();
        
        Tinebase_Core::getLogger()->debug(__METHOD__ . '::' . __LINE__ . " eventData " . print_r($event->toArray(), true));
        
        return $event;
    }
    
    /**
     * convert contact from xml to Calendar_Model_EventFilter
     *
     * @param SimpleXMLElement $_data
     * @return Addressbook_Model_ContactFilter
     */
    protected function _toTineFilter(SimpleXMLElement $_data)
    {
        $xmlData = $_data->children('uri:Calendar');
        
        $filterArray[] = array(
            'field'     => 'containerType',
            'operator'  => 'equals',
            'value'     => 'all'
        ); 
        
        foreach($this->_mapping as $fieldName => $value) {
            if(isset($xmlData->$fieldName)) {
                $filterArray[] = array(
                    'field'     => $value,
                    'operator'  => 'equals',
                    'value'     => (string)$xmlData->$fieldName
                );
            }
        }
        
        $filter = new Calendar_Model_EventFilter($filterArray); 
    
        Tinebase_Core::getLogger()->debug(__METHOD__ . '::' . __LINE__ . " filterData " . print_r($filter, true));
        
        return $filter;
    }
    
    /**
     * converts an iso formated date into a timestamp
     *
     * @param  string Zend_Date::ISO8601 representation of a datetime filed
     * @return int    UNIX Timestamp
     */
    protected function _convertISOToTs($_ISO)
    {
        $matches = array();
        
        preg_match("/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/", $_ISO, $matches);

        if (count($matches) !== 7) {
            throw new Tinebase_Exception_UnexpectedValue("invalid date format $_ISO");
        }
        
        list($match, $year, $month, $day, $hour, $minute, $second) = $matches;
        return  mktime($hour, $minute, $second, $month, $day, $year);
    }
    
    /**
     * decode timezone info from activesync
     * 
     * @param string $_packedTimezoneInfo the packed timezone info
     * @return array
     */
    public function unpackTimezoneInfo($_packedTimezoneInfo)
    {
        $timezoneUnpackString = 'lbias/a64standardName/vstandardYear/vstandardMonth/vstandardDayOfWeek/vstandardDay/vstandardHour/vstandardMinute/vstandardSecond/vstandardMilliseconds/lstandardBias/a64daylightName/vdaylightYear/vdaylightMonth/vdaylightDayOfWeek/vdaylightDay/vdaylightHour/vdaylightMinute/vdaylightSecond/vdaylightMilliseconds/ldaylightBias';

        $timezoneInfo = unpack($timezoneUnpackString, base64_decode($_packedTimezoneInfo));
        
        return $timezoneInfo;
    }
    
    /**
     * encode timezone info to activesync
     * 
     * @param array $_timezoneInfo
     * @return string
     */
    public function packTimezoneInfo($_timezoneInfo) {
        
        $packed = pack(
            "la64vvvvvvvvla64vvvvvvvvl",
            $_timezoneInfo["bias"], 
            $_timezoneInfo["standardName"], 
            $_timezoneInfo['standardYear'],
            $_timezoneInfo["standardMonth"], 
            $_timezoneInfo['standardDayOfWeek'],
            $_timezoneInfo["standardDay"], 
            $_timezoneInfo["standardHour"], 
            $_timezoneInfo["standardMinute"], 
            $_timezoneInfo['standardSecond'],
            $_timezoneInfo['standardMilliseconds'],
            $_timezoneInfo["standardBias"], 
            $_timezoneInfo["daylightName"], 
            $_timezoneInfo['daylightYear'],
            $_timezoneInfo["daylightMonth"], 
            $_timezoneInfo['daylightDayOfWeek'],
            $_timezoneInfo["daylightDay"], 
            $_timezoneInfo["daylightHour"], 
            $_timezoneInfo["daylightMinute"], 
            $_timezoneInfo['daylightSecond'],
            $_timezoneInfo['daylightMilliseconds'],
            $_timezoneInfo["daylightBias"] 
        );

        return base64_encode($packed);
    }
}