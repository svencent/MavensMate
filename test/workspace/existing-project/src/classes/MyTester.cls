@isTest
private class MyTester {
	
	@isTest static void test_method_one() {
		system.assert(True == True);
	}
	
	@isTest static void test_method_two() {
		system.assert(False == True);
	}
}