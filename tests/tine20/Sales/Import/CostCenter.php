<?php
/**
 * Tine 2.0 - http://www.tine20.org
 *
 * @package     Sales
 * @license     http://www.gnu.org/licenses/agpl.html
 * @copyright   Copyright (c) 2018 Metaways Infosystems GmbH (http://www.metaways.de)
 * @author      Christian Feitl<c.feitl@metawas.de>
 */

/**
 * Test class for Sales
 */
class Sales_Import_CostCenter extends TestCase
{
    /**
     * @var Tinebase_Model_Container
     */
    protected $_importContainer = null;

    protected function tearDown()
    {
        parent::tearDown();
        self::clear('Sales', 'CostCenter');

    }

    public function testImportDemoData()
    {
        self::clear('Sales', 'CostCenter');
        $importer = new Tinebase_Setup_DemoData_Import('Sales_Model_CostCenter', [
            'definition' => 'sales_import_costcenter_csv',
        ]);
        $importer->importDemodata();
        $filter = Tinebase_Model_Filter_FilterGroup::getFilterForModel('Sales_Model_CostCenter', [
            ['field' => 'creation_time', 'operator' => 'within', 'value' => 'dayThis']
        ]);
        $result = Sales_Controller_CostCenter::getInstance()->search($filter);
        self::assertEquals(4, count($result));
    }
}