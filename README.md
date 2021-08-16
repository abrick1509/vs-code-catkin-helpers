# README

Provides some simple helper functions to work with catkin projects. It basically wraps shell-commands to build & test the code into VS Code functionality, which allows to assign some handy keybindings. It also allows to take full advantage of the integrated terminal for debugging purposes/error handling.
## Features
### Related to the currently opened file:
1.1 Call `catkin build` on the opened file's package (w/ dependencies).  
1.2 Call `make install` in the build folder of the opened file's package (w/o dependencies).  
1.3 Call `make tests` for the opened file's package (w/o dependencies).  
1.4 Run all tests for the opened file's package.  

### Related to opened catkin workspace:
2.1 Pick package from list for a `catkin build` (see 1.1 above).  
2.2 Pick package from list for a `make install` (see 1.2 above).  
## Commands/Keybindings
| Name                                                          | Description         | Default Value |
| ------------------------------------------------------------- | ------------------- | ------------- |
| `Catkin Helpers (Current File): catkin-build current package` | See 1.1 from above  | `undefined`   |
| `Catkin Helpers (Current File): Make current package`         | See 1.2. from above | `ctrl+b`      |
| `Catkin Helpers (Test): Make tests of current package`        | See 1.3. from above | `undefined`   |
| `Catkin Helpers (Test): Run tests of current package`         | See 1.4. from above | `undefined`   |
| `Catkin Helpers (List): Select package to catkin-build`       | See 2.1. from above | `undefined`   |
| `Catkin Helpers (List): Select package to make`               | See 2.2. from above | `ctrl+m`      |
 
## Test Execution
Since our current project setup relies on various environmental variables/sourced files for test execution, this extension intentionally doesn't register itself as a Test Adapter for the general Test Explorer extension. It seemed easier and more appropriate to just execute the tests in the integrated terminal (since this is already fully setup and properly sourced). Also, this allows for straight forward error handling.  
This might need to be changed in future versions.
## Known Issues
When executing tests, this extension looks for the following hard-coded test executable names:
* `{filename}`
* `{package_name}_{filename}`
  
This seems appropriate for our current project setup. However, we might want to extend/improve on this to allow for a more general test creation. 
Let's see how far we can get with this.

**Please report [bugs](https://github.com/abrick1509/vs-code-catkin-helpers/issues)! This is a very early version!**

**Enjoy!**
