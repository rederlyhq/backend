import { Request, Response, NextFunction } from "express";
const router = require('express').Router();
import * as asyncHandler from 'express-async-handler'
import multer = require("multer");
import axios from 'axios';
import httpResponse from "../../utilities/http-response";
import { exception } from "console";
import StudentWorkController from "./student-work-controller";
import Session from "../../database/models/session";

const preSignUrlAxios = axios.create({
    baseURL: '',
    responseType: 'json',
});

const API_ENDPOINT = 'https://0vz21posdb.execute-api.us-east-1.amazonaws.com/dev/get_custom_url'

router.get('/presign-url',
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
            const pre_sign_url = await preSignUrlAxios.get(API_ENDPOINT);
            console.log(pre_sign_url.data)
            next(httpResponse.Ok('Here is a presign url', {data: pre_sign_url.data}))
    }));
    

router.post('/post-path',
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // TODO figure out session for request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = Number(req.body.userId)
    const file_path = req.body.file_path
    console.log(file_path)
    try {
        const enrollment = await StudentWorkController.UploadPath({
            userId: user,
            file_path: file_path
        });
        console.log(enrollment);
        next(httpResponse.Ok('Enrolled', enrollment));
    } catch (e) {
        console.log(e)
    }
}));

router.get('/get-path',
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // TODO figure out session for request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const problemId = Number(req.query.problemId)
    console.log(problemId + 55555)
    try {
        const path = await StudentWorkController.getPath({
            problemId: problemId
        });
        console.log(path);
        next(httpResponse.Ok('data', {data: path}));
    } catch (e) {
        console.log(e)
    }
}));

module.exports = router;