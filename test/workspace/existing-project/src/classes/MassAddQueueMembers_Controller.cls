public class MassAddQueueMembers_Controller {
	
	public queuemember[] members {get;set;}
	
	public MassAddQueueMembers_Controller() {
		
		set<id> existing_userids = new set<id>();		
		for (leadqueuemember__c existing_member : [select user__c from leadqueuemember__c]) {
			existing_userids.add(existing_member.user__c);	
		}
		
		members = new queuemember[]{};
		for (user u : [select id, name from user where id not in :existing_userids and isactive = true]) {
			members.add(new QueueMember(u));
		}
	}
	
    public PageReference cancel() {
		return null;
    }
	
	public PageReference selectAll() {
		for (queueMember qm : members) {
			qm.isSelected = true;
		}
		
		return null;
	}
	
	public PageReference selectNone() {
		for (queueMember qm : members) {
			qm.isSelected = false;
		}
		
		return null;
	}
	
	public PageReference processSelected() {
		leadqueuemember__c[] new_members = new leadqueuemember__c[]{};
		
		for (queueMember qm : members) {
			if (!qm.isSelected)
				continue;
				
			leadqueuemember__c new_member = new leadqueuemember__c();
			new_member.user__c = qm.user.id;
			//new_member.isactive__c = qm.isActive;
			new_member.isactive__c = true;
			new_member.round_robin_member__c = qm.isRoundRobin;
			new_members.add(new_member);
		}
		
		insert new_members;
		
		return null;
	}
	
	public class QueueMember {
    	
    	public queueMember(User u) {
    		this.user = u;	
    	}
    	
    	public User user {get;set;}
    	public boolean isActive {get;set;}
    	public boolean isRoundRobin {get;set;}
    	public boolean isSelected {get;set;}
    	
	}

}