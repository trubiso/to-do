const task = require('./task.js');
const prompts = require('prompts');
const chalk = require('chalk');
const { Status, Task, TaskStep, saveTasks } = require('./task.js');

const Commands = ["Tasks...", "Exit the program."];
const TaskCommands = ["View tasks.", "Edit tasks.", "Exit tasks."];
const TaskSortModes = ["Name", "Description", "Due", "Status", "Progress"];
const TaskSortModesModes = ["Ascending", "Descending"];
const TaskProperties = ["Name", "Description", "Due", "Status", "Steps", "Delete", "Exit"];
const StepProperties = ["Name", "Description", "Progress", "Status", "Delete", "Exit"];

const taskFile = "task.json";

async function getCommand(cmds, msg = 'What do you want to do?'){
    let cmds_a = []; cmds.forEach(v=>{cmds_a.push({title: v})});
    let response;
    while(true){
        response = await prompts({
            type: 'autocomplete',
            name: 'value',
            message: msg,
            choices: cmds_a
        });
        if (cmds.includes(response.value)) break;
        else console.log(chalk.rgb(205, 49, 43).dim("× Invalid command. "))
    }
    return response.value;
}

function sortTasks(tasks = [], _sortMode = 'name', reverse = false){
    let sortMode = TaskSortModes[_sortMode].toLowerCase();
    switch(sortMode){
    case "description":
        if (reverse) return tasks.sort((a,b) => (a.description < b.description) ? 1 : ((b.description < a.description) ? -1 : 0));
        else return tasks.sort((a,b) => (a.description > b.description) ? 1 : ((b.description > a.description) ? -1 : 0));
    case "due":
        if (reverse) return tasks.sort((a,b) => (a.due < b.due) ? 1 : ((b.due < a.due) ? -1 : 0));
        else return tasks.sort((a,b) => (a.due > b.due) ? 1 : ((b.due > a.due) ? -1 : 0));
    case "status":
        if (reverse) return tasks.sort((a,b) => (a.status > b.status) ? 1 : ((b.status > a.status) ? -1 : 0));
        else return tasks.sort((a,b) => (a.status < b.status) ? 1 : ((b.status < a.status) ? -1 : 0));
    case "progress":
        if (reverse) return tasks.sort((a,b) => (a.progress < b.progress) ? 1 : ((b.progress < a.progress) ? -1 : 0));
        else return tasks.sort((a,b) => (a.progress > b.progress) ? 1 : ((b.progress > a.progress) ? -1 : 0));
    default:
        if (reverse) return tasks.sort((a,b) => (a.name < b.name) ? 1 : ((b.name < a.name) ? -1 : 0));
        else return tasks.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
    }
}

function formatPercentage(p){
    return chalk.rgb(parseInt((100 - p) / 100 * 255), parseInt(p / 100 * 255), 10).dim(p.toString() + "%");
}

function formatTasks(tasks = []){
    let o = '';
    tasks.forEach(v=>{
        o += `\n${chalk.bold(chalk.blue(v.name))} - ${chalk.blueBright(v.description)}. \
${chalk.yellow(`Due ${v.due.toDateString() + " at " + v.due.toLocaleTimeString()}`)}, \
in status ${task.formatStatus(v.status)} and percentage ${formatPercentage(v.progress)}. ${chalk.bold("Steps: ")}`;
        v.steps.forEach(b=>{
            o += `\n\t${chalk.bold(b.name)} - ${b.description}: ${task.formatStatus(b.status)}, ${formatPercentage(b.progress)} done.`
        });
    });
    return o;
}

async function shellTasksEditCreate(tasks){
    // this is all we need: Name, Description, Due, Status, Steps.
    // actually i'm not going to let people set initial status because it's a new task, and they probably haven't started doing it just when creating it.
    let _areYouSure = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'Do you want to create a task?'
    });
    let areYouSure = _areYouSure.value;
    if (!areYouSure) return;
    let _taskName = await prompts({
        type: 'text',
        name: 'value',
        message: 'Task name...'
    });
    let taskName = _taskName.value;
    let _taskDescription = await prompts({
        type: 'text',
        name: 'value',
        message: 'Task description...'
    });
    let taskDescription = _taskDescription.value;
    let _taskDue = await prompts({
        type: 'date',
        name: 'value',
        message: 'Task due date...'
    });
    let taskDue = _taskDue.value;
    // steps can be created later.
    tasks.push(new Task(taskName, taskDescription, taskDue, Status.NotStarted, []));
    saveTasks(tasks, taskFile);
}

async function shellTasksEditStepsCreate(tasks, taskToEdit){
    // all we need -> Name, "Description", "Progress", "Status"
    // actually i'm not going to do progress or status. because you probably haven't started :sad:
    let _areYouSure = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'Do you want to create a step?'
    });
    let areYouSure = _areYouSure.value;
    if (!areYouSure) return;
    let _stepName = await prompts({
        type: 'text',
        name: 'value',
        message: 'Step name...'
    });
    let stepName = _stepName.value;
    let _stepDescription = await prompts({
        type: 'text',
        name: 'value',
        message: 'Step description...'
    });
    let stepDescription = _stepDescription.value;
    taskToEdit.steps.push(new TaskStep(stepName, stepDescription, 0, Status.NotStarted));
    saveTasks(tasks, taskFile);
}

async function shellTasksEditSteps(tasks, taskToEdit){
    let _stepToEditOpts = taskToEdit.steps.slice();
    _stepToEditOpts.push(new TaskStep("New step...", "Create a new step.", 0, Status.InProgress));
    let _stepToEdit = await prompts({
        type: 'select',
        name: 'value',
        message: 'Select a step to edit.',
        choices: _stepToEditOpts
    });
    if (_stepToEditOpts[_stepToEdit.value].name == "New step...") {
        await shellTasksEditStepsCreate(tasks, taskToEdit);
        return;
    } else {
        let _propertyToEdit = await prompts({
            type: 'select',
            name: 'value',
            message: 'Edit...',
            choices: StepProperties
        });
        let stepToEdit = taskToEdit.steps[_stepToEdit.value];
        let stepPropertyToEdit = StepProperties[_propertyToEdit.value].toString();
        let newValue_s, n_s;
        switch(stepPropertyToEdit.toLowerCase()){
        case "name": case "description":
            n_s = await prompts({
                type: 'text',
                name: 'value',
                message: 'New ' + stepPropertyToEdit.toLowerCase()
            }); newValue_s = n_s.value;
            stepPropertyToEdit.toLowerCase() == "name" ? stepToEdit.name = newValue_s : stepToEdit.description = newValue_s;
            break;
        case "progress":
            n_s = await prompts({
                type: 'number',
                name: 'value',
                message: 'New progress',
                initial: 0,
                style: 'default',
                min: 0,
                max: 100
            }); newValue_s = n_s.value;
            stepToEdit.progress = newValue_s;
            break;
        case "status":
            n_s = await prompts({
                type: 'select',
                name: 'value',
                message: 'New status',
                choices: Object.keys(Status)
            }); newValue_s = n_s.value;
            stepToEdit.status = Object.values(Status)[newValue_s];
            break;
        case "delete":
            const index = taskToEdit.steps.indexOf(stepToEdit);
            if (index > -1) taskToEdit.steps.splice(index, 1);
            saveTasks(tasks, taskFile);
            return;
        case "exit": default:
            return false;
        }
        taskToEdit.steps[_stepToEdit.value] = stepToEdit;
    }
}

async function shellTasksEdit(tasks){
    let _taskToEditOpts = tasks.slice();
    _taskToEditOpts.push(new Task("New task...", "Create a new task.", 1, Status.InProgress, []));
    let _taskToEdit = await prompts({
        type: 'select',
        name: 'value',
        message: 'Select a task to edit.',
        choices: _taskToEditOpts
    });
    if (_taskToEditOpts[_taskToEdit.value].name == "New task...") {
        await shellTasksEditCreate(tasks);
        return;
    } else {
        let _taskPropertyToEdit = await prompts({
            type: 'select',
            name: 'value',
            message: 'Edit...',
            choices: TaskProperties
        });
        let taskToEdit = tasks[_taskToEdit.value];
        let taskPropertyToEdit = TaskProperties[_taskPropertyToEdit.value].toString();
        let newValue, n;
        switch(taskPropertyToEdit.toLowerCase()){
        case "name": case "description":
            n = await prompts({
                type: 'text',
                name: 'value',
                message: 'New ' + taskPropertyToEdit.toLowerCase()
            }); newValue = n.value;
            taskPropertyToEdit.toLowerCase() == "name" ? taskToEdit.name = newValue : taskToEdit.description = newValue;
            break;
        case "due":
            n = await prompts({
                type: 'date',
                name: 'value',
                message: 'New date'
            }); newValue = n.value; 
            taskToEdit.due = newValue;
            break;
        case "status":
            n = await prompts({
                type: 'select',
                name: 'value',
                message: 'New status',
                choices: Object.keys(Status)
            }); newValue = n.value;
            taskToEdit.status = Object.values(Status)[newValue];
            break;
        case "steps":
            await shellTasksEditSteps(tasks, taskToEdit);
            break;
        case "delete":
            const index = tasks.indexOf(taskToEdit);
            if (index > -1) tasks.splice(index, 1);
            break;
        case "exit": default:
            return;
        }
        saveTasks(tasks, taskFile);
    }
}

async function shellTasks() {
    let exit = false;
    let cmd = await getCommand(TaskCommands, 'Tasks...');
    let tasks = await task.getTasks(taskFile);
    switch(cmd){
    case "View tasks.":
        let sortMode = await prompts({
            type: 'select',
            name: 'value',
            message: 'Sort by...',
            choices: TaskSortModes
        });
        let r = await prompts({
            type: 'select',
            name: 'value',
            message: 'Mode:',
            choices: TaskSortModesModes
        });
        let reverse = r.value == 1;
        console.log(formatTasks(sortTasks(tasks, sortMode.value, reverse)));
        break;
    case "Edit tasks.":
        await shellTasksEdit(tasks);
        break;
    case "Exit tasks.":
        exit = true;
        break;
    }
    return exit;
}

async function shell(){
    let exit = false;
    let cmd = await getCommand(Commands);
    switch(cmd){
    case "Tasks...":
        while(!await shellTasks()){}
        break;
    case "Exit the program.":
        exit = true;
        break;
    }
    return exit;
}

async function main(){
    /*let tasks = await task.getTasks(taskFile);
    tasks.forEach(v=>console.log(v.toString()));
    tasks.forEach(v=>console.log(v.toJSON()));
    console.log(tasks);*/
    while(!await shell()){}
}

main();