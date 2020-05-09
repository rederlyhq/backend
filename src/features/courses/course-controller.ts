import Bluebird = require('bluebird');
import Course from '../../database/models/course';


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
}

export const courseController = new CourseController();
export default courseController;