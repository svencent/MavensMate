public class ConvertAccountLeads_Test {
	
   	static testMethod void test_convert_leads() {
   		
   		Account a = new Account (
   			name = 'test account that will not be found in the database',
   			billingstreet = '123 main st', 
   			billingcity = 'a city', 
   			billingstate = 'PA',   
   			phone = '333444555'
   		); 
   		insert a;
   		
   		Lead l = new Lead (
   			firstname = 'my',
   			lastname = 'test',
   			company = 'test account that will not be found in the database',
   			email = 'test@email.com'
   		);
   		insert l;
   		
   		Lead l2 = new Lead (
   			firstname = 'my',
   			lastname = 'test 2',
   			company = 'test account that will not be found in the database',
   			email = 'test2@email.com'
   		);
   		insert l2;
   		
		ApexPages.StandardController account_controller = new ApexPages.StandardController(a);
	    ConvertAccountLeads_Controller controller = new ConvertAccountLeads_Controller(account_controller);
		
		controller.leadList = controller.getMatchingLeads();
		system.assertEquals(2, controller.leadList.size());
		
		controller.selectAll();
		system.assertequals(true, controller.leadlist[0].selected);
		system.assertequals(true, controller.leadlist[1].selected);
		
		controller.selectNone();
		system.assertequals(false, controller.leadlist[0].selected);
		system.assertequals(false, controller.leadlist[1].selected);
		
		controller.leadlist[0].selected = true;
		
		System.debug(controller.leadList);
		controller.processSelected();
		system.assertEquals(true, [select isconverted from lead where id = :l.id][0].isconverted);
		system.assertEquals(false, [select isconverted from lead where id = :l2.id][0].isconverted);
		
		controller.cancel();

    }    
}