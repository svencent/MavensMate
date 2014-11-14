public class compile_and_test {
	
	public static testMethod void test_lead_queue_member_triggers() {
		
		user[] users = [select id, name from user where isactive = true limit 2];
				
		LeadQueueMember__c member = new LeadQueueMember__c();
		member.user__c = users.get(0).id;
		member.isactive__c = true;
		insert member;
		system.assertequals(users.get(0).name, [select name from LeadQueueMember__c where id = :member.id][0].name);
	
		LeadQueueMember__c member2 = new LeadQueueMember__c();
		member2.user__c = users.get(0).id;
		member2.isactive__c = true;
		try { insert member2; }
		catch(exception e) { 
			system.assert(e.getMessage().contains('This user is already a lead queue member'));
		}
	}
	
	public static testMethod void test_indexes() {
		
		String currentUser = UserInfo.getUserId();
		String owner1 = [select id from user where isactive = true AND id != : currentUser][0].id;
		String owner2 = [select id from user where isactive = true AND id != :owner1][0].id;
		//TEST ACCOUNT INDEXES
		Account a = new Account();
		a.name = '1234567 inc.';
		a.website = 'www.1234567.com/test';
		a.ownerid = owner1;
		insert a;
		system.assertequals('1234567.com', [select domain__c from account where id = :a.id][0].domain__c);
		system.assertequals('1234567', [select clean_account_name__c from account where id = :a.id][0].clean_account_name__c);
		
		a.name = 'a different name';
		a.website = 'www.54321.com';
		update a;
		
		a.website = 'www.1234567.com/test';
		update a;
		
		//TEST CONTACT INDEXES
		Contact c = new Contact();
		c.firstname = 'john';
		c.lastname = 'doe';
		c.accountid = a.id;
		c.email = 'johndoe@1234567.com';
		insert c;	
		system.assertequals('1234567.com;', [select domainlist__c from account where id = :a.id][0].domainlist__c);
		
		Contact cdup = new Contact();
		cdup.firstname = 'john';
		cdup.lastname = 'doe';
		cdup.accountid = a.id;
		cdup.email = 'johndoe@1234567.com';
		try { insert cdup; }
		catch(exception e) { system.debug('testing123: ' + e); }	
		
		Contact c2 = new Contact();
		c2.firstname = 'john';
		c2.lastname = 'doe';
		c2.accountid = a.id;
		c2.email = 'johndoe@gmail.com';
		insert c2;		
		system.assertequals('1234567.com;', [select domainlist__c from account where id = :a.id][0].domainlist__c);
		 
		Contact c3 = new Contact();
		c3.firstname = 'john';
		c3.lastname = 'doe';
		c3.accountid = a.id;
		c3.email = 'johndoe@1234567inc.com';
		insert c3;				
		system.assertequals('1234567.com;1234567inc.com;', [select domainlist__c from account where id = :a.id][0].domainlist__c);
		
		c3.email = 'johndoe@1234567.com';
		update c3;
				
		//TEST LEAD DOMAIN INDEX
		lead l = new lead();
		l.firstname = 'joe';
		l.lastname = 'smith';
		l.company = 'test company';
		l.email = 'test@gmail.com';
		insert l;
		system.assertequals('gmail.com', [select domain__c from lead where id = :l.id][0].domain__c);
	}
}