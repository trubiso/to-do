const fs = require("fs-extra");
const chalk = require('chalk');

const Status = {NotStarted: "NS", InProgress: "IP", Paused: "P", Finished: "F"}
const parseStatus = v=>Object.values(Status).includes(v)?v:Status.NotStarted;
const numberPadding = (i,z)=>('000000000'+i.toString()).substr(-z);
const formatStatus = s=>s == "F" ? chalk.green("Finished") : (s == "P" ? chalk.yellow("Paused") : (s == "IP" ? chalk.cyan("In progress") : chalk.red(chalk.bold("Not started"))));

class TaskStep {
    constructor(_name, _description, _progress, _status) {
        this.name = _name;
        this.description = _description;
        this.progress = parseInt(_progress);
        this.status = parseStatus(_status);
    }

    toString() {
        return this.name;
    }

    toJSON() {
        return {
            "name": this.name,
            "description": this.description,
            "progress": this.progress,
            "status": this.status
        };
    }
}

class Task {
    constructor(_name, _description, _due, _status, _taskSteps) {
        this.name = _name;
        this.description = _description;
        this.due = new Date(_due);
        this.status = parseStatus(_status);
        this.steps = _taskSteps;
        this.progress = 0;
        if (this.steps.length > 0) {
            this.steps.forEach(v=>{this.progress+=v.progress});
            this.progress /= this.steps.length;
            this.progress = parseInt(this.progress);
        }
    }

    toString() {
        return this.name;
    }

    toJSON() {
        let o = {
            "name": this.name,
            "description": this.description,
            "due": `${this.due.getFullYear()}-${numberPadding(this.due.getMonth()+1,2)}-${numberPadding(this.due.getDate(),2)} ${this.due.getHours()}:${this.due.getMinutes()}:${this.due.getSeconds()}`,
            "status": this.status,
            "steps": []
        }
        this.steps.forEach(v=>{
            o.steps.push(v.toJSON());
        });
        return o;
    }
}

async function getTasks(file){
    try {
        let tasks = [];
        const data = await fs.readJSON(file);
        for (task of data.tasks){
            let steps = [];
            for (step of task.steps) {
                steps.push(new TaskStep(step.name, step.description, step.progress, step.status));
            }
            tasks.push(new Task(task.name, task.description, task.due, task.status, steps));
        }
        return tasks;
    } catch (error) {
        return [new Task("Create some new tasks!", "don't forget to make some steps too, it's very easy", Date.now(), Status.InProgress, [new TaskStep("Create your first task...", "Firstly, go to \"Edit tasks.\" and select \"Create new...\" to create your first task!", 0, Status.NotStarted)])];
    }
}

async function saveTasks(tasks, file){
    e={"tasks": []};
    tasks.forEach(v=>{e.tasks.push(v.toJSON())});
    return await fs.writeJSON(file, e);
}

module.exports = {
    Status: Status, parseStatus: parseStatus, numberPadding: numberPadding, formatStatus: formatStatus, TaskStep: TaskStep, Task: Task, getTasks: getTasks, saveTasks: saveTasks
};