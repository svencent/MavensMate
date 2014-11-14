public with sharing class MyApexClass {
	
	public Boolean helloWorld;

	public MyApexClass() {
		helloWorld = false;

		if (true == false) {
			String foo = 'bar';
		}
	}
}