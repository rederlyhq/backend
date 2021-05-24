import User from '../../database/models/user';
import { Request, Response } from 'express';
import CourseTopicContent from '../../database/models/course-topic-content';
import CourseUnitContent from '../../database/models/course-unit-content';
import Course from '../../database/models/course';
import lti from '../../database/lti-init';
import { LTIKToken } from './lti-types';

// TODO: If no course mapping exists for the context, have form prompt for a course to bind, then grab topics for that course.
lti.onDeepLinking(async (token: LTIKToken, _req: Request, res: Response) => {
    console.log(token);
    const email = token?.userInfo?.email ?? token?.platformContext?.custom?.userinfoemail;
    if (!token.platformContext?.deepLinkingSettings) {
        throw new Error('This platform does not support deep linking and did not provide a deep_link_return_url');
    }

    const user = await User.findOne({
        where: {
            email: email
        }
    });

    if (!user) throw new Error('No user found during deep linking');

    const topics = await CourseTopicContent.findAll({
        where: {
            active: true,
        },
        limit: 30,
        include: [{
            model: CourseUnitContent,
            as: 'unit',
            attributes: ['id'],
            required: true,
            where: {
                active: true,
            },
            include: [{
                model: Course,
                as: 'course',
                attributes: ['id'],
                required: true,
                where: {
                    active: true,
                    instructorId: user.id,
                }
            }]
        }]
    });
    
    if (!topics || topics.length < 1) throw new Error('No topics found during deep linking');

    const objs = topics.map((topic) => {
        return ({
            type: 'ltiResourceLink',
            // The URL is supposed to be a fully qualified URL to the resource, but not every route we have is directly accessible via LTI.
            // so instead, we use custom for redirecting.
            // url: `http://test.rederly.com:3002/common/courses/${topic.unit?.course?.id}/topic/${topic.id}`,
            // url: `http://test.rederly.com:3002/backend-api/lti?redir=${encodeURIComponent(`common/courses/${topic.unit?.course?.id}/topic/${topic.id}`)}`,
            url: 'http://test.rederly.com:3002/backend-api/lti',
            custom: {
                redirect: `http://test.rederly.com:3002/common/courses/${topic.unit?.course?.id}/topic/${topic.id}`
            },
            title: topic.name,
            text: topic.description,
            lineItem: {
                scoreMaximum: 100,
                resourceId: topic.id,
            },
            available: {
                startDateTime: topic.startDate.toISOString(),
                // Topics always accessible after end date? Unless exam?
                // endDateTime: topic.endDate.toISOString(),
            },
            submission: {
                startDateTime: topic.startDate.toISOString(),
                endDateTime: topic.endDate.toISOString(),
            }
        });
    });

    const form = await Promise.all(objs.map(async (obj) => `
                <div class="card">
                    <div>${obj.title}</div>
                    <button type="submit" name="JWT" value="${await lti.DeepLinking.createDeepLinkingMessage(token, [obj], { message: `Successfully registered ${obj.title}!` })}" >Select</button>
                </div>
        `));

    res.send(`
        <style>
            .cards {
                display: grid;
                grid-template-columns: repeat(auto-fill, 29%);
                grid-auto-rows: auto;
                grid-gap: 1rem;
            }
                
            .card {
                border: 2px solid #e7e7e7;
                border-radius: 4px;
                padding: .5rem;
                text-align: center;
            }
        </style>
        <div class="cards">
            <form action="${token.platformContext.deepLinkingSettings.deep_link_return_url}" method="POST">
                ${form.join('')}
            </form>
        </div>
    `);
});

module.exports = lti;
