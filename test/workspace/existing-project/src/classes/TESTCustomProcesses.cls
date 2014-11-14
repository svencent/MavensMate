public class TESTCustomProcesses 
{
	static testMethod void doNewApproval()
	{
		String userId = [select id from user where isactive = true limit 1][0].id;
		List<Opportunity> myOpps = new List<Opportunity>();
		
		Account a = new Account(name = 'test', revenue_type__c = 'project');
		insert a; 
		
		Opportunity o = new Opportunity(
			name = 'test',
			closedate = Date.today(),
			stagename = 'Qualification',
			accountid = a.id
		);
		insert o;
		myOpps.add(o); 
		
		CustomProcess.doNewIntake(myOpps, 'Sales Intake', 'test comments', userId); 
		CustomProcess.handleAction(myOpps, 'Approve', userId, 'test comments');
		
	}
}