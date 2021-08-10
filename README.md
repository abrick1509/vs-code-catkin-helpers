# README

Provides some simple helper functions to work with catkin projects. It basically wraps shell-commands to build & test the code into VS Code functionality, which allows to assign some handy keybindings. It also allows to take full advantage of the integrated terminal for debugging purposes/error handling.
## Features
1. Build catkin package of current file w/ dependencies.
2. Build catkin package of current file w/o dependencies.
3. Directly call make for the current file's package (requires initial `catkin build` of the package).
4. Build all tests for current package.
5. Run all tests for the current package.
6. Run all tests of the current file.
7. Run test under cursor in current file.
8. TODO: Scan and visualize results of last test run.  

## Keybindings
| Name                                                             | Description       | Default Value |
| ---------------------------------------------------------------- | ----------------- | ------------- |
| `Catkin Helpers: catkin build current package`                   | See 1. from above | `undefined`   |
| `Catkin Helpers: catkin build current package w/o dependencies.` | See 2. from above | `undefined`   |
| `Catkin Helpers: Make current package`                           | See 3. from above | `ctrl+b`      |
| `Catkin Helpers: Make tests of current package`                  | See 4. from above | `undefined`   |
| `Catkin Helpers: Run tests of current package`                   | See 5. from above | `undefined`   |
| `Catkin Helpers: Run tests of current file`                      | See 6. from above | `undefined`   |
| `Catkin Helpers: Run test under cursor.`                         | See 7. from above | `undefined`   |
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
