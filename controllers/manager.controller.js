import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import prisma from '../DB/db.config.js'
import extractContent from '../utils/htmlExtractor.js'

// login manager
export const login_manager = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email) {
            return res.status(400).json({ status: 400, msg: 'Email is required' })
        }
        if (!password) {
            return res.status(400).json({ status: 400, msg: 'Password is required' })
        }

        // check email and password
        const isEmail = await prisma.manager.findUnique({ where: { email } })
        const isPassword = bcrypt.compareSync(password, isEmail.password)

        if (!isEmail || !isPassword) {
            return res.status(400).json({ message: 'Invalid Credentials' })
        }

        const data = {
            id: isEmail.id,
            username: isEmail.username,
            profile_path: isEmail.profile_path,
            states: isEmail.states,
            country: isEmail.country,
        }
        // send token
        const token = jwt.sign(data, process.env.SECRET_KEY, { expiresIn: '999h' })
        res.status(200).json({ status: 200, message: 'Logged in Succesfully', token: token, id: isEmail.id, profile: isEmail })

    } catch (error) {
        console.log(error)
        res.status(400).json({ message: 'Something went wrong' })

    }

}

// get each manager profile
export const eachManager = async (req, res) => {
    try {
        const managerId = +req.params.managerId
        const manager = await prisma.manager.findUnique(
            {
                where: { id: managerId },
                include: {
                    creators: true,
                    doctors: true,
                    assignedCategory: true
                }
            })

        if (!manager) {
            return res.status(404).json({ msg: 'No Manager found' })
        }

        res.status(200).json({ manager })

    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}


// all content for manager only assigned creators
export const getContentByManager = async (req, res) => {
    try {
        const managerUsername = req.query.managerUsername;

        if (!managerUsername) {
            return res.status(400).json({ status: 400, msg: "Manager username is required" });
        }

        const allArticle = await prisma.article_content.findMany({
            where: {
                Creator: {
                    assignedManager: managerUsername
                }
            }
        });

        const allYt = await prisma.yt_content.findMany({
            where: {
                creator: {
                    assignedManager: managerUsername
                }
            }
        });


        const allBlog = await prisma.blog_content.findMany({
            where: {
                Creator: {
                    assignedManager: managerUsername
                }
            }
        });


        const blogDataArray = allBlog.map(blog => {
            const extractedContent = extractContent(blog.content);
            return {
                id: blog.id,
                tags: blog.tags,
                category: blog.category,
                data: extractedContent,
                verified: blog.verified,
                createdAt: blog.createdAt,
                updatedAt: blog.updatedAt,
                blog_creatorId: blog.blog_creatorId
            };
        });

        if (allArticle.length == 0 && allBlog.length == 0 && allYt.length == 0) {
            return res.status(404).json({ status: 404, msg: "No Content Found" })
        }

        const data = { allYt, allArticle, allBlog: blogDataArray }

        res.status(200).json({ status: 200, msg: data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, msg: "Internal server error" });
    }
};




// get manager specific notification 

// -------unread
export const getManagerUnreadNotification = async (req, res) => {
    const managerId = +req.params.managerId;
    try {
        const notifications = await prisma.managerNotification.findMany({
            where: {
                managerId: managerId,
                isRead: false,
            },
            select: {
                id:true,
                title:true,
                content:true,
                data:true
            }
        });

        const count = notifications.length;

        if (count === 0) {
            return res.status(404).json({ status: 404, msg: 'No unread notifications' });
        }
        res.status(200).json({ status: 200, notifications, count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, msg: 'Something went wrong' });
    }
}

//----------read
export const getManagerReadNotification = async (req, res) => {
    const managerId = +req.params.managerId;
    try {
        const notifications = await prisma.managerNotification.findMany({
            where: {
                managerId: managerId,
                isRead: true,
            },
            select: {
                id:true,
                title:true,
                content:true,
                data:true
            }
        })

        const count = notifications.length;
        if (count === 0) {
            return res.status(404).json({ status: 404, msg: 'No read notifications' });
        }

        res.status(200).json({ status: 200, notifications, count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, msg: 'Something went wrong' });
    }
}
// mark manger notification as read
export const markManagerNotificationAsRead = async (req, res) => {
    const notificationId = +req.params.notificationId
    try {
        const mark = await prisma.managerNotification.update({ where: { id: notificationId }, data: { isRead: true } })
        res.status(200).json({ status: 200, msg: 'Notification mark as read successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

// manager stats
export const managerStats = async (req, res) => {
    const managerId = +req.params.managerId
    try {
        const isManager = await prisma.manager.findUnique({ where: { id: managerId } })
        const username = isManager?.username
        //creators
        const totalCreators = (await prisma.creator.findMany({ where: { assignedManager: username } })).length
        const activeCreators = (await prisma.creator.findMany({ where: { assignedManager: username, status: 'active' } })).length
        const inactiveCreators = (await prisma.creator.findMany({ where: { assignedManager: username, status: 'inactive' } })).length
        const temporarilyOffCreators = (await prisma.creator.findMany({ where: { assignedManager: username, status: 'temporaryoff' } })).length
        //doctors
        const totalDoctors = (await prisma.doctor.findMany({ where: { assignedManager: username } })).length
        const activeDoctors = (await prisma.doctor.findMany({ where: { assignedManager: username, status: 'active' } })).length
        const inactiveDoctors = (await prisma.doctor.findMany({ where: { assignedManager: username, status: 'inactive' } })).length
        const temporarilyOffDoctors = (await prisma.doctor.findMany({ where: { assignedManager: username, status: 'temporaryoff' } })).length
        const pendingDoctors = (await prisma.doctor.findMany({ where: { assignedManager: username, verified: 'no' } })).length
        const certifiedDoctors = (await prisma.doctor.findMany({ where: { assignedManager: username, verified: 'yes' } })).length
        // blogs
        const totalBlogs = (await prisma.blog_content.count({
            where: {
                Creator: {
                    assignedManager: username
                }
            }
        }))

        const pendingBlogs = (await prisma.blog_content.count({
            where: {
                Creator: {
                    assignedManager: username
                },
                verified: 'pending'
            }
        }))

        const publishBlogs = (await prisma.blog_content.count({
            where: {
                Creator: {
                    assignedManager: username
                },
                verified: 'publish'
            }
        }))

        const unpublishBlogs = (await prisma.blog_content.count({
            where: {
                Creator: {
                    assignedManager: username
                },
                verified: 'unpublish'
            }
        }))

        const improveBlogs = (await prisma.blog_content.count({
            where: {
                Creator: {
                    assignedManager: username
                },
                verified: 'improve'
            }
        }))

        const rejectedBlogs = (await prisma.blog_content.count({
            where: {
                Creator: {
                    assignedManager: username
                },
                verified: 'rejected'
            }
        }))
        // articles
        const totalArticles = (await prisma.article_content.count({
            where: {
                Creator: {
                    assignedManager: username
                }
            }
        }))

        const pendingArticles = (await prisma.article_content.count({
            where: {
                Creator: {
                    assignedManager: username
                },
                verified: 'pending'
            }
        }))

        const publishArticles = (await prisma.article_content.count({
            where: {
                Creator: {
                    assignedManager: username
                },
                verified: 'publish'
            }
        }))

        const unpublishArticles = (await prisma.article_content.count({
            where: {
                Creator: {
                    assignedManager: username
                },
                verified: 'unpublish'
            }
        }))

        const improveArticles = (await prisma.article_content.count({
            where: {
                Creator: {
                    assignedManager: username
                },
                verified: 'improve'
            }
        }))

        const rejectedArticles = (await prisma.article_content.count({
            where: {
                Creator: {
                    assignedManager: username
                },
                verified: 'rejected'
            }
        }))
        // yt content
        const totalYtContent = (await prisma.yt_content.count({
            where: {
                creator: {
                    assignedManager: username
                }
            }
        }))

        const pendingYtContent = (await prisma.yt_content.count({
            where: {
                creator: {
                    assignedManager: username
                },
                verified: 'pending'
            }
        }))

        const publishYtContent = (await prisma.yt_content.count({
            where: {
                creator: {
                    assignedManager: username
                },
                verified: 'publish'
            }
        }))

        const unpublishYtContent = (await prisma.yt_content.count({
            where: {
                creator: {
                    assignedManager: username
                },
                verified: 'unpublish'
            }
        }))

        const improveYtContent = (await prisma.yt_content.count({
            where: {
                creator: {
                    assignedManager: username
                },
                verified: 'improve'
            }
        }))

        const rejectedYtContent = (await prisma.yt_content.count({
            where: {
                creator: {
                    assignedManager: username
                },
                verified: 'rejected'
            }
        }))
        res.status(200).json({
            status: 200,
            totalCreators: {
                "name": "Total Creators",
                "number": totalCreators
            },
            activeCreators: {
                "name": "Active Creators",
                "number": activeCreators
            },
            inactiveCreators: {
                "name": "Inactive Creators",
                "number": inactiveCreators
            },
            temporarilyOffCreators: {
                "name": "Temporarily Off Creators",
                "number": temporarilyOffCreators
            },
            totalDoctors: {
                "name": "Total Doctors",
                "number": totalDoctors
            },
            activeDoctors: {
                "name": "Active Doctors",
                "number": activeDoctors
            },
            inactiveDoctors: {
                "name": "Inactive Doctors",
                "number": inactiveDoctors
            },
            temporarilyOffDoctors: {
                "name": "Temporarily Off Doctors",
                "number": temporarilyOffDoctors
            },
            pendingDoctors: {
                "name": "Pending Doctors",
                "number": pendingDoctors
            },
            certifiedDoctors: {
                "name": "Certified Doctors",
                "number": certifiedDoctors
            },
            totalBlogs: {
                "name": "Total Blogs",
                "number": totalBlogs
            },
            pendingBlogs: {
                "name": "Pending Blogs",
                "number": pendingBlogs
            },
            publishBlogs: {
                "name": "Published Blogs",
                "number": publishBlogs
            },
            unpublishBlogs: {
                "name": "Unpublished Blogs",
                "number": unpublishBlogs
            },
            improveBlogs: {
                "name": "Blogs for Improvement",
                "number": improveBlogs
            },
            rejectedBlogs: {
                "name": "Rejected Blogs",
                "number": rejectedBlogs
            },
            totalArticles: {
                "name": "Total Articles",
                "number": totalArticles
            },
            pendingArticles: {
                "name": "Pending Articles",
                "number": pendingArticles
            },
            publishArticles: {
                "name": "Published Articles",
                "number": publishArticles
            },
            unpublishArticles: {
                "name": "Unpublished Articles",
                "number": unpublishArticles
            },
            improveArticles: {
                "name": "Articles for Improvement",
                "number": improveArticles
            },
            rejectedArticles: {
                "name": "Rejected Articles",
                "number": rejectedArticles
            },
            totalYtContent: {
                "name": "Total YouTube Content",
                "number": totalYtContent
            },
            pendingYtContent: {
                "name": "Pending YouTube Content",
                "number": pendingYtContent
            },
            publishYtContent: {
                "name": "Published YouTube Content",
                "number": publishYtContent
            },
            unpublishYtContent: {
                "name": "Unpublished YouTube Content",
                "number": unpublishYtContent
            },
            improveYtContent: {
                "name": "YouTube Content for Improvement",
                "number": improveYtContent
            },
            rejectedYtContent: {
                "name": "Rejected YouTube Content",
                "number": rejectedYtContent
            }

        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}