public class compile_and_test_one_off {
	
	static testmethod void test_one_off() {
		Test.startTest();
		
		lead l = new lead();
		l.firstname = 'Guy';
		l.lastname = 'Smith';
		l.company = '[not provided]';
		l.leadsource = 'Corporate Web Site';
		l.email = 'guy.smith@siliconstrat.com'; 
		insert l;
		
		Test.stopTest();
		 
		system.assertEquals('00530000000fmo1', [select ownerid from lead where id = :l.id][0].ownerid);
		//END TEST CONTACT OWNER MATCH
	}
	
}