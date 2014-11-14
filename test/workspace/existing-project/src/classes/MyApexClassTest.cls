@isTest
private class MyApexClassTest {
	
	@isTest static void test_method_one() {
		MyApexClass a = new MyApexClass();
		system.assertEquals(true, a.helloWorld);
	}
	
	@isTest static void test_method_two() {
		// Implement test code
	}
	
}