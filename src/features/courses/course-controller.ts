import Bluebird = require('bluebird');
import Course from '../../database/models/course';
import StudentEnrollment from '../../database/models/student-enrollment';
import { ForeignKeyConstraintError } from 'sequelize';
import NotFoundError from '../../exceptions/not-found-error';

interface EnrollByCodeOptions {
    code: string;
    userId: number;
}

class CourseController {
    getCourseById(id: number): Bluebird<Course> {
        return Course.findOne({
            where: {
                id
            }
        })
    }

    getCourses(): Bluebird<Course[]> {
        return Course.findAll();
    }

    createCourse(courseObject: Course): Bluebird<Course> {
        return Course.create(courseObject);
    }

    getCourseByCode(code: string): Promise<Course> {
        return Course.findOne({
            where: {
                code
            }
        })
    }

    async enroll(enrollment: StudentEnrollment): Promise<StudentEnrollment> {
        try {
            return await StudentEnrollment.create(enrollment);
        } catch (e) {
            if (e instanceof ForeignKeyConstraintError) {
                throw new NotFoundError('User or course was not found');
            }
            throw e;
        }
    }

    async enrollByCode(enrollment: EnrollByCodeOptions): Promise<StudentEnrollment> {
        try {
            const course = await this.getCourseByCode(enrollment.code);
            if(course === null) {
                throw new NotFoundError('Could not find course with the given code');
            }
            return this.enroll({
                courseId: course.id,
                userId: enrollment.userId,
                enrollDate: new Date(),
                dropDate: new Date()
            } as StudentEnrollment);
        } catch (e) {
            if (e instanceof ForeignKeyConstraintError) {
                throw new NotFoundError('User or course was not found');
            }
            throw e;
        }
    }
}

export const courseController = new CourseController();
export default courseController;