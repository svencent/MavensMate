@isTest
private class compile_and_test_distributor {
	
	static testmethod void test_contact_match() {
		LeadDistributionHandler distributor = new LeadDistributionHandler();
		list<string> userids = new list<string>();
		for (string s : distributor.availableUserIds) {
			userids.add(s);
		}
		
		//TEST CONTACT OWNER MATCH 
		account a = new account();
		a.name = 'this is a long test account name';
		a.ownerid = userids.get(0);
		insert a;
		
		contact c = new contact();
		c.accountid = a.id;
		c.firstname = 'Audrey';
		c.lastname = 'Smith';
		c.email = 'asmith@test--something.com';
		c.ownerid = userids.get(0);
		insert c;
		
		Test.startTest();
		
		lead l = new lead();
		l.firstname = 'Audrey';
		l.lastname = 'Smith III';
		l.company = 'a company';
		l.leadsource = 'something';
		l.email = 'asmith@test--something.com'; 
		insert l;
		
		Test.stopTest();
		 
		system.assertEquals(c.ownerid, [select ownerid from lead where id = :l.id][0].ownerid);
		//END TEST CONTACT OWNER MATCH
	}


	static testmethod void test_account_domain_match() {
		LeadDistributionHandler distributor = new LeadDistributionHandler();
		list<string> userids = new list<string>();
		for (string s : distributor.availableUserIds) {
			userids.add(s);
		}
	
		//TEST ACCOUNT DOMAIN MATCH
		account a = new account();
		a.name = 'this is a long test account name';
		a.website = 'http://www.this-is-a-test-domain.com';
		a.ownerid = userids.get(0);
		insert a;
		system.assertequals('this-is-a-test-domain.com', [select domain__c from account where id = :a.id][0].domain__c);
				
		Test.startTest();
		
		lead l = new lead();
		l.firstname = 'Audrey';
		l.lastname = 'Smith III';
		l.company = 'a company';
		l.leadsource = 'something';
		l.email = 'asmith@this-is-a-test-domain.com'; 
		insert l;
		
		Test.stopTest();
		 
		system.assertEquals(a.ownerid, [select ownerid from lead where id = :l.id][0].ownerid);
		
		set<id> leadids = new set<id>();
		leadids.add(l.id);
		LeadAssignment.disqualifyLeads(leadids);
		//END TEST ACCOUNT DOMAIN MATCH
	}
	
	static testmethod void test_account_name_match() {
		LeadDistributionHandler distributor = new LeadDistributionHandler();
		list<string> userids = new list<string>();
		for (string s : distributor.availableUserIds) {
			userids.add(s);
		}
	
		//TEST ACCOUNT DOMAIN MATCH
		account a = new account();
		a.name = 'this is a test account name for matching';
		a.ownerid = userids.get(0);
		insert a;
				
		Test.startTest();
		
		lead l = new lead();
		l.firstname = 'Audrey';
		l.lastname = 'Smith III';
		l.company = 'this is a test account name for matching';
		l.leadsource = 'something';
		insert l;
		
		Test.stopTest();
		 
		system.assertEquals(a.ownerid, [select ownerid from lead where id = :l.id][0].ownerid);
		//END TEST ACCOUNT DOMAIN MATCH
	}
	
	static testmethod void test_contact_conflict() {
		LeadDistributionHandler distributor = new LeadDistributionHandler();
		list<string> userids = new list<string>();
		for (string s : distributor.availableUserIds) {
			userids.add(s);
		}
		
		//TEST CONTACT OWNER CONFLICT
		account a = new account();
		a.name = 'this is another test account name';
		a.ownerid = userids.get(1);
		insert a;
		
		contact c = new contact();
		c.accountid = a.id;
		c.firstname = 'Audrey';
		c.lastname = 'Smith';
		c.email = 'asmith@test--something.com';
		c.ownerid = userids.get(1);
		insert c;
		
		contact c2 = new contact();
		c2.accountid = a.id;
		c2.firstname = 'Audrey';
		c2.lastname = 'Smith';
		c2.email = 'asmith@test--something.com';
		c2.ownerid = userids.get(2);
		insert c2;
		
		Test.startTest();
		
		lead l = new lead();
		l.firstname = 'Audrey';
		l.lastname = 'Smith III';
		l.company = 'a company';
		l.leadsource = 'something';
		l.email = 'asmith@test--something.com'; 
		insert l;
		
		Test.stopTest();
		 
		system.assertEquals('Conflicts', [select owner.name from lead where id = :l.id][0].owner.name);
		//END TEST CONTACT OWNER CONFLICT
	}
	
	static testmethod void test_lead_match() {
		
		LeadDistributionHandler distributor = new LeadDistributionHandler();
		list<string> userids = new list<string>();
		for (string s : distributor.availableUserIds) {
			userids.add(s);
		}
		
		Test.startTest();
		lead l = new lead();
		l.firstname = 'Audrey';
		l.lastname = 'Smith III';
		l.company = 'a company';
		l.leadsource = 'something';
		l.email = 'asmith@gmail.com'; 
		insert l;
		Test.stopTest(); 
		system.assertEquals('Review Room', [select owner.name from lead where id = :l.id][0].owner.name);
		
		l.ownerid = userids.get(2);
		update l;
		
		lead l2 = new lead();
		l2.firstname = 'Audrey';
		l2.lastname = 'Smith III';
		l2.company = 'a company';
		l2.leadsource = 'something';
		l2.email = 'asmith@gmail.com'; 
		insert l2;
		
		LeadAssignment.assignLeadsByRoundRobin(new set<id>{l2.id}, true);		
		
	}
	
	static testmethod void test_lead_domain_match() {
		
		LeadDistributionHandler distributor = new LeadDistributionHandler();
		list<string> userids = new list<string>();
		for (string s : distributor.availableUserIds) {
			userids.add(s);
		}
		
		lead l = new lead();
		l.firstname = 'Audrey';
		l.lastname = 'Smith III';
		l.company = 'a company';
		l.leadsource = 'something';
		l.email = 'asmith@domainmatchtest.com'; 
		insert l;
		
		l.ownerid = userinfo.getuserid();
		update l;
		
		Test.startTest();
		lead l2 = new lead();
		l2.firstname = 'Audrey';
		l2.lastname = 'Smith III';
		l2.company = 'a company';
		l2.leadsource = 'something';
		l2.email = 'jdoe@domainmatchtest.com'; 
		insert l2;		
		Test.stopTest();
		
		system.assertEquals('domainmatchtest.com', [select domain__c from lead where id = :l2.id][0].domain__c);

	}
}