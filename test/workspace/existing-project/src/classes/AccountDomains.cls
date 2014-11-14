public class AccountDomains {  

	//does some stuff
	//some more stuff
	public static void doContactDomains(Set<Id> myAccountIds) { 
		Set<String> personalDomains = AccountDomains.getPersonalDomains();
		List<Account> myAccounts = [select id, domain__c, (select id, domain__c from contacts) from account where id in :myAccountIds];
		
		System.debug(myAccounts);
		
		for (Account a : myAccounts) {
			String myDomainString = '';
			String accountDomain = '';
			if (a.domain__c != null)
				accountDomain = a.domain__c;
			
			Set<String> contactDomainSet = new Set<String>();

			for (Contact c : a.contacts) {
				if (c.domain__c != null) {
					if (accountDomain != c.domain__c && personalDomains.contains(c.domain__c) == false)
						contactDomainSet.add(c.domain__c); 
				}
			} 
			
			System.debug('this is my contact domain set ' + contactDomainSet);
			
			for (String s : contactDomainSet)
				myDomainString += s + ';';
			
			if (myDomainString.length() <= 1)
				a.contactdomainlist__c = null;	
			else
				a.contactdomainlist__c = myDomainString;	
		}
		
		try {
			update myAccounts;
		} catch(DmlException e) { 
			System.debug(e); 
		}
	}
	
	public static set<string> getPersonalDomains() {
		set<string> personalDomains = new set<string>();		
		personalDomains.add('126.com');
		personalDomains.add('163.com');
		personalDomains.add('adelphia.net');
		personalDomains.add('aim.com');
		personalDomains.add('aol.com');
		personalDomains.add('aol.in');
		personalDomains.add('att.net');
		personalDomains.add('austin.rr.com');
		personalDomains.add('bellsouth.net');
		personalDomains.add('bellsouth.netr');
		personalDomains.add('bellsystems.biz');
		personalDomains.add('bigpond.net.au');
		personalDomains.add('btinternet.com');
		personalDomains.add('carolina.rr.com');
		personalDomains.add('cgx1.com');
		personalDomains.add('charter.net');
		personalDomains.add('cinci.rr.com');
		personalDomains.add('cogeco.ca');
		personalDomains.add('cogentco.com');
		personalDomains.add('columbus.rr.com');
		personalDomains.add('comcast.net');
		personalDomains.add('consultant.com');
		personalDomains.add('cox.net');
		personalDomains.add('damails.us');
		personalDomains.add('earthlink.net');
		personalDomains.add('ec.rr.com');
		personalDomains.add('email.com');
		personalDomains.add('embarqmail.com');
		personalDomains.add('epix.net');	
		personalDomains.add('excite.com');
		personalDomains.add('fuse.net');
		personalDomains.add('gmail.ca');
		personalDomains.add('gmail.co');
		personalDomains.add('gmail.com');
		personalDomains.add('gmx.com');
		personalDomains.add('googlemail.com');
		personalDomains.add('hawaii.rr.com');
		personalDomains.add('hotmail.co.uk');
		personalDomains.add('hotmail.com');
		personalDomains.add('hotmail.com.ph');
		personalDomains.add('hotmail.fr');
		personalDomains.add('ilwllc.com');
		personalDomains.add('inbox.com');
		personalDomains.add('inbox.ru');
		personalDomains.add('indiatimes.com');
		personalDomains.add('insight.rr.com');
		personalDomains.add('insightbb.com');
		personalDomains.add('ipass.com');
		personalDomains.add('juno.com');
		personalDomains.add('la.nfl.net');
		personalDomains.add('live.ca');
		personalDomains.add('live.com');
		personalDomains.add('lucintel.com');
		personalDomains.add('lycos.com');
		personalDomains.add('lzar.com');
		personalDomains.add('mac.com');
		personalDomains.add('mail.com');
		personalDomains.add('mailinator.com');
		personalDomains.add('maine.rr.com');
		personalDomains.add('mchsi.com');
		personalDomains.add('mindspring.com');
		personalDomains.add('msn.com');
		personalDomains.add('mycoolhaus.com');
		personalDomains.add('nc.rr.com');
		personalDomains.add('netscape.net');
		personalDomains.add('netzero.com');
		personalDomains.add('netzero.net');
		personalDomains.add('new.rr.com');
		personalDomains.add('nyc.rr.com');
		personalDomains.add('nycap.rr.com');
		personalDomains.add('optonline.net');
		personalDomains.add('peoplepc.com');
		personalDomains.add('post.com');
		personalDomains.add('prodigy.net');
		personalDomains.add('qwest.net');
		personalDomains.add('rediffmail.com');
		personalDomains.add('rjwebmail.com');
		personalDomains.add('rochester.rr.com');
		personalDomains.add('rocketmail.com');
		personalDomains.add('rogers.com');
		personalDomains.add('salesmail.us');
		personalDomains.add('sbcglobal.net');
		personalDomains.add('sc.rr.com');
		personalDomains.add('shaw.ca');
		personalDomains.add('sify.com');
		personalDomains.add('snapemedia.com');
		personalDomains.add('sogetthis.com');
		personalDomains.add('stratmail.com');
		personalDomains.add('sympatico.ca');
		personalDomains.add('tampabay.rr.com');
		personalDomains.add('telus.net');
		personalDomains.add('triad.rr.com');
		personalDomains.add('tx.rr.com');
		personalDomains.add('us.icap.com');
		personalDomains.add('usa.net');
		personalDomains.add('verizon.net');
		personalDomains.add('videotron.ca');
		personalDomains.add('wi.rr.com');
		personalDomains.add('windstream.net');
		personalDomains.add('woh.rr.com');
		personalDomains.add('wowway.com');
		personalDomains.add('yahoo.ca');
		personalDomains.add('yahoo.co.in');
		personalDomains.add('yahoo.co.uk');
		personalDomains.add('yahoo.com');
		personalDomains.add('yahoo.com.ar');
		personalDomains.add('yahoo.com.au');
		personalDomains.add('yahoo.com.br');
		personalDomains.add('yahoo.com.cn');
		personalDomains.add('yahoo.com.mx');
		personalDomains.add('yahoo.com.ph');
		personalDomains.add('yahoo.com.sg');
		personalDomains.add('yahoo.com.tw');
		personalDomains.add('yahoo.es');
		personalDomains.add('yahoo.fr');
		personalDomains.add('ymail.com');
		personalDomains.add('zapak.com');		
		return personalDomains;
	}
	
	public static set<string> getCorporateIdentifiers() {
		set<string> corporateIdentifiers = new set<string>();
		corporateIdentifiers.add(' ab');
		corporateIdentifiers.add(' a.b');
		corporateIdentifiers.add(' ag');
		corporateIdentifiers.add(' b.v');
		corporateIdentifiers.add(' bv');
		corporateIdentifiers.add(' co');
		corporateIdentifiers.add(' co.');
		corporateIdentifiers.add(' cos');
		corporateIdentifiers.add(' company');
		corporateIdentifiers.add(' corp');
		corporateIdentifiers.add(' corp.');
		corporateIdentifiers.add(' corporation');
		corporateIdentifiers.add(' ev');
		corporateIdentifiers.add(' gbr');
		corporateIdentifiers.add(' gesellschaft');
		corporateIdentifiers.add(' gmbh');
		corporateIdentifiers.add(' inc');
		corporateIdentifiers.add(' inc.');
		corporateIdentifiers.add(' incorporated');
		corporateIdentifiers.add(' kg');
		corporateIdentifiers.add(' k.g');
		corporateIdentifiers.add(' kgaa');
		corporateIdentifiers.add(' l.c');
		corporateIdentifiers.add(' l.l.c');
		corporateIdentifiers.add(' l.l.c.n');
		corporateIdentifiers.add(' l.l.p');
		corporateIdentifiers.add(' l.p');
		corporateIdentifiers.add(' limited');
		corporateIdentifiers.add(' limited_liability_company');
		corporateIdentifiers.add(' limited_liability_partnership');
		corporateIdentifiers.add(' limited_partnership');
		corporateIdentifiers.add(' llc');
		corporateIdentifiers.add(' llp');
		corporateIdentifiers.add(' l-p');
		corporateIdentifiers.add(' ltd');
		corporateIdentifiers.add(' ltd.');
		corporateIdentifiers.add(' ltée');
		corporateIdentifiers.add(' mbh');
		corporateIdentifiers.add(' n.v');
		corporateIdentifiers.add(' nv');
		corporateIdentifiers.add(' ohg');
		corporateIdentifiers.add(' o.h.g');
		corporateIdentifiers.add(' p.a');
		corporateIdentifiers.add(' p.c');
		corporateIdentifiers.add(' p.l.c');
		corporateIdentifiers.add(' p.l.l.c');
		corporateIdentifiers.add(' p.l.l.p');
		corporateIdentifiers.add(' plc');
		corporateIdentifiers.add(' pllc');
		corporateIdentifiers.add(' pllp');
		corporateIdentifiers.add(' private_entity_trade_limited');
		corporateIdentifiers.add(' private_limited_partnership');
		corporateIdentifiers.add(' pte');
		corporateIdentifiers.add(' pte._ltd');
		corporateIdentifiers.add(' pte_ltd');
		corporateIdentifiers.add(' s._a');
		corporateIdentifiers.add(' s.a');
		corporateIdentifiers.add(' s.a.r.l');
		corporateIdentifiers.add(' sa');
		corporateIdentifiers.add(' sarl');
		return corporateIdentifiers;
	}
}