/**
 * This is a set of demo / test routes for the scheduler
 */
import express = require('express');
const router = express.Router();
import schedulerHelper, { HttpMethod } from './utilities/scheduler-helper';
import * as moment from 'moment';
import expressAsyncHandler = require('express-async-handler');

router.all('/set', 
expressAsyncHandler(async (req: any, res: any, next: any) => {
    let result: unknown; 
    const time = moment().add(req.query.minutes ? parseInt(req.query.minutes) : 1, 'minutes');
    const id = req.query.id || new Date().toString();
    try {
        const resp = await schedulerHelper.setJob({
            id: id,
            time: time.toDate(),
            webHookScheduleEvent: {
                method: HttpMethod.POST,
                url: 'http://localhost:3001/backend-api/schedule/hook',
                data: JSON.stringify({
                    data: req.query.data,
                    time: time,
                    id: id
                })
            }
        });
        result = resp.data;
    } catch (e) {
        result = e.message;
    }
    res.json({
        time,
        id,
        result,
    });
}));

router.all('/getAll', 
expressAsyncHandler(async (req: any, res: any, next: any) => {
    let result: unknown; 
    const title = req.query.title || new Date().toString();
    try {
        const resp = await schedulerHelper.listScheduledJobs();
        result = resp.data;
    } catch (e) {
        result = e.message;
    }
    res.json({
        title,
        result,
    });
}));

router.all('/getAllFailed', 
expressAsyncHandler(async (req: any, res: any, next: any) => {
    let result: unknown; 
    const title = req.query.title || new Date().toString();
    try {
        const resp = await schedulerHelper.listFailedJobs();
        result = resp.data;
    } catch (e) {
        result = e.message;
    }
    res.json({
        title,
        result,
    });
}));

router.all('/get', 
expressAsyncHandler(async (req: any, res: any, next: any) => {
    let result: unknown; 
    const id = req.query.id || new Date().toString();
    try {
        const resp = await schedulerHelper.getJob({
            id: id,
        });
        result = resp.data;
    } catch (e) {
        result = e.message;
    }
    res.json({
        id,
        result,
    });
}));

router.all('/delete', 
expressAsyncHandler(async (req: any, res: any, next: any) => {
    let result: unknown; 
    const id = req.query.id || new Date().toString();
    try {
        const resp = await schedulerHelper.deleteJob({
            id: id,
        });
        result = resp.data;
    } catch (e) {
        result = e.message;
    }
    res.json({
        id,
        result,
    });
}));

let count = 0;

router.all('/hook',
// bodyParser.raw({
//     type: '*/*'
// }),
(req: any, res: any, next: any) => {
    count++;
    console.log(`hook hit ${count} times!`);
    console.log(new Date());
    console.log(req.body);
    res.send('success');
});

module.exports = router;