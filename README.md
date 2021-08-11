# README

Provides some simple helper functions to work with catkin projects. It basically wraps shell-commands to build & test the code into VS Code functionality, which allows to assign some handy keybindings. It also allows to take full advantage of the integrated terminal for debugging purposes/error handling.
## Features
### Related to the currently opened file:
1.1 Call `catkin build` on the opened file's package (w/ dependencies).  
1.2 Call `make install` in the build folder of the opened file's package (w/o dependencies).  

### Related to opened catkin workspace:
2.1 Pick package from list for a `catkin build` (see 1.1 above).  
2.2 Pick package from list for a `make install` (see 1.2 above).  


### Related to test execution:
3.1 Call `make tests` for the opened file's package (w/o dependencies).  
3.2 Run all tests for the opened file's package.  
3.3 Run all tests of the current file.  
3.4 Run test under cursor in current file.  
3.5 TODO: Scan and visualize results of last test run.    

## Keybindings
| Name                                                          | Description         | Default Value |
| ------------------------------------------------------------- | ------------------- | ------------- |
| `Catkin Helpers (Current File): catkin-build current package` | See 1.1 from above  | `undefined`   |
| `Catkin Helpers (Current File): Make current package`         | See 1.2. from above | `ctrl+b`      |
| `Catkin Helpers (List): Select package to catkin-build`       | See 2.1. from above | `undefined`   |
| `Catkin Helpers (List): Select package to make`               | See 2.2. from above | `ctrl+m`      |
| `Catkin Helpers (Test): Make tests of current package`        | See 3.1. from above | `undefined`   |
| `Catkin Helpers (Test): Run tests of current package`         | See 3.2. from above | `undefined`   |
| `Catkin Helpers (Test): Run tests of current file`            | See 3.3. from above | `undefined`   |
| `Catkin Helpers (Test): Run test under cursor.`               | See 3.4. from above | `undefined`   |
 ## Options
 | Name                       | Description                         | Default Value |
 | -------------------------- | ----------------------------------- | ------------- |
 | `catkin-helpers.shellType` | Shell type used for test execution. | `zsh`         |

## Test Execution
Since our current project setup relies on various environmental variables/sourced files for test execution, this extension intentionally doesn't register itself as a Test Adapter for the general Test Explorer extension. It seemed easier and more appropriate to just execute the tests in the integrated terminal (since this is already fully setup and properly sourced). Also, this allows for straight forward error handling.  
This might need to be changed in future versions.
## Known Issues
When executing tests, this extension looks for the following hard-coded test executable names:
* `{filename}`
* `{package_name}_{filename}`
  
This seems appropriate for our current project setup. However, we might want to extend/improve on this to allow for a more general test creation. 
Let's see how far we can get with this.

**Please report bugs! This is a very early version!**

**Enjoy!**
