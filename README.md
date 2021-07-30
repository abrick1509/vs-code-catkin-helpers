# README

Provides some helper functions to work with catkin projects.
## Features
1. Build catkin package of current file with dependencies.
2. Build catkin package of current file w/o dependencies.
3. Directly call make for the current file's package (requires initial `catkin build` of the package).
4. Build tests for current package.
5. Run all tests for current package (currently only works for `zsh`).
6. TODO: Run all tests of current file (in case this includes tests).
7. TODO: Run test under cursor in current file.
8. TODO: Scan and visualize results of last test run.  

## Keybindings
| Name                                                             | Description       | Default Value |
| ---------------------------------------------------------------- | ----------------- | ------------- |
| `Catkin Helpers: catkin build current package`                   | See 1. from above | `undefined`   |
| `Catkin Helpers: catkin build current package w/o dependencies.` | See 2. from above | `undefined`   |
| `Catkin Helpers: Make current package`                           | See 3. from above | `ctrl+b`      |
| `Catkin Helpers: Make tests of current package`                  | See 4. from above | `undefined`   |
| `Catkin Helpers: Run tests of current package`                   | See 5. from above | `undefined`   |
 ## Options
 | Name                                                             | Description       | Default Value |
| ---------------------------------------------------------------- | ----------------- | ------------- |
| `catkin-helpers.shellType`                   | Shell type used for test execution.    | `zsh`

## Known Issues
Nothing known so far. 

**Please report more bugs! This is a very early version!**

**Enjoy!**
