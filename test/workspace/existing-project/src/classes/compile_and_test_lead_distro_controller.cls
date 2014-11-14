public class compile_and_test_lead_distro_controller {
	
	static testmethod void test_controller() {
		leaddistributionsystem__c lead_distro_system = new leaddistributionsystem__c();
		lead_distro_system.name = 'Lead Distribution';
		lead_distro_system.isactive__c = false;
		insert lead_distro_system;
		
		LeadDistributor_Configuration_Controller page = new LeadDistributor_Configuration_Controller();
		page.lead_distro = lead_distro_system;
		page.getQueueMembers();
		page.getUpcomingVacation();
		page.setLeadDistributorStatus();
		system.assertequals(true, [select isactive__c from leaddistributionsystem__c where id = :lead_distro_system.id][0].isactive__c);
		
		id review_room_id = [select queueid from queuesobject where queue.name = 'Review Room'][0].queueid;
		id conflict_id = [select queueid from queuesobject where queue.name = 'Conflicts'][0].queueid;
		
		//insert review room lead
		lead l = new lead();
		l.firstname = 'adam';
		l.lastname = 'west';
		l.company = 'some company name';
		l.ownerid = review_room_id;
		insert l;
			
		page.leads = page.getReviewRoomLeads();
	
		//insert conflict lead
		lead conflict_lead = new lead();
		conflict_lead.firstname = 'adam';
		conflict_lead.lastname = 'west';
		conflict_lead.company = 'another company name';
		conflict_lead.ownerid = conflict_id;
		insert conflict_lead;
		
		page.conflict_leads = page.getConflictLeads();
		
		pagereference distribute = page.distribute_conflict_leads();
		pagereference refresh = page.refreshPage();
	}
	
}