import { Request, Response, NextFunction } from "express";
const router = require('express').Router();
import * as asyncHandler from 'express-async-handler'
import multer = require("multer");

router.get('/',
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        try {
            return res.status(200).json({status:"ok"})
        } catch (e) {
            return res.status(500).json({error: "Internal server error"});
        }
    }));

module.exports = router;