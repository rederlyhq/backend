import { Request, Response, NextFunction } from "express";
const router = require('express').Router();
import * as asyncHandler from 'express-async-handler'
import httpResponse from "../../utilities/http-response";

router.get('/',
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        next(httpResponse.Ok('Health Ok'));
    }));

module.exports = router;