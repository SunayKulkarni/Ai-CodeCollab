import projectModel from '../models/project.model.js'
import * as projectService from '../services/project.service.js'
import userModel from '../models/user.model.js'
import { validationResult } from 'express-validator'


export const createProject = async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try{
        const {name}=req.body;
        const loggedInUser = await userModel.findOne({ email: req.user.email})
        console.log('Creating project for user:', loggedInUser);
        
        const userId = loggedInUser._id;
        const newProject = await projectService.createProject({ name, userId })
        console.log('New project created:', newProject);
        
        // Fetch the full project with populated users
        const fullProject = await projectModel.findById(newProject._id)
            .populate('users', 'email _id')
            .lean();
            
        console.log('Full project with populated users:', fullProject);
        
        // Ensure the project has the correct user structure
        if (!fullProject.users.some(u => u._id.toString() === userId.toString())) {
            console.log('Adding user to project');
            fullProject.users = [loggedInUser, ...fullProject.users];
        }
        
        res.status(201).json({ project: fullProject });
    }
    catch(err){
        console.error('Create project error:', err);
        res.status(400).send(err.message)
    }
}

export const getAllProject = async (req, res) => {
    try{
        const loggedInUser = await userModel.findOne({ email: req.user.email})  
        console.log('Getting projects for user:', loggedInUser._id);

        const allUserProjects = await projectService.getAllProjectByUserId({ 
            userId: loggedInUser._id 
        })
        console.log('Found projects:', allUserProjects);

        return res.status(200).json({
            projects: allUserProjects
        })

    }
    catch(err){
        console.error('Get all projects error:', err);
        res.status(400).json({ error: err.message })
    }
}

export const addUserToProject = async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }


    try{
        const { projectId, users} = req.body;

        const loggedInUser = await userModel.findOne({ email: req.user.email})

        const project = await projectService.addUsersToProject({
            projectId,
            users,
            userId: loggedInUser._id
        });

        return res.status(200).json({
            project
        });

    }
    catch(err){
        console.log(err)
        res.status(400).json({ error: err.message })
    }


}

export const getProjectById = async (req, res) => { 
    const { projectId } = req.params;
    
    try{
        const project = await projectService.getProjectById({ projectId });
        return res.status(200).json({project});
    }
    catch(err){
        console.log(err)
        res.status(400).json({ error: err.message })
    }
}