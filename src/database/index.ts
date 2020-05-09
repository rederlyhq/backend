import logger from '../utilities/logger';
import appSequelize from './app-sequelize';

import User from './models/user';
import University from './models/university';
import Session from './models/session';
import Permission from './models/permission';
import Course from './models/course';
import UniversityCurriculumPermission from './models/university_curriculum_permission';
import CurriculumUnitContent from './models/curriculum_unit_content';
import CurriculumTopicContent from './models/curriculum-topic-content';
import CurriculumWWTopicQuestion from './models/curriculum-ww-topic-question';
import StudentEnrollment from './models/student-enrollment';
import CourseUnitContent from './models/course-unit-content';
import CourseTopicContent from './models/course-topic-content';
import TopicCalendar from './models/topic-calendar';
import TopicType from './models/topic-type';
import CourseWWTopicQuestion from './models/course-ww-topic-question';
import StudentGrade from './models/student-grade';

export const sync = async (): Promise<void> => {
    try {
        await appSequelize.authenticate();
        await appSequelize.sync();
    } catch (e) {
        logger.error('Could not init sequelize', e)
    }
};

const database = {
    User,
    University,
    Session,
    Permission,
    Course,
    UniversityCurriculumPermission,
    CurriculumUnitContent,
    CurriculumTopicContent,
    CurriculumWWTopicQuestion,
    StudentEnrollment,
    CourseUnitContent,
    CourseTopicContent,
    TopicCalendar,
    TopicType,
    CourseWWTopicQuestion,
    StudentGrade,
    appSequelize
}

export default database;
