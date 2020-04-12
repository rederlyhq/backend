import { Request, Response } from "express";

const router = require('express').Router();

router.post('/login',
    // TODO add req validation
    // TODO add passport auth
    (req: Request, res: Response) => {
        const MILLIS_PER_HOUR = 3600000;
        const cookieOptions = {
            maxAge: MILLIS_PER_HOUR // TODO add a configuration for session life
        };
        res.cookie('sessionToken', 'test', cookieOptions);
        return res.status(200).json({}); // TODO create a response
    });

module.exports = router;