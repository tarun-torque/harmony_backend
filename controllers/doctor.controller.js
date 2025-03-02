import 'dotenv/config'
import { json } from "express";
import prisma from "../DB/db.config.js";
import { messages } from "@vinejs/vine/defaults";
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import transporter from '../utils/transporter.js';
import { toDoctor } from './push_notification/notification.js';
import extractContent from '../utils/htmlExtractor.js';
import { allPatient } from './admin.controller.js';
import path from 'path'
import moment from 'moment-timezone'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import exp from 'constants';
import router from '../routes/api.js';
import { profile } from 'console';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// doctor price of service
export const doctorPrice = async (req, res) => {
    const doctorId = +req.params.doctorId;
    const serviceId = +req.params.serviceId;
    const { yourPrice } = req.body;
    try {
        if (!yourPrice) {
            return res.status(400).json({ status: 400, msg: 'Your Price is required' })
        }

        const updatePrice = await prisma.doctorPrice.create({ data: { doctorId, serviceId, yourPrice } })
        res.status(200).json({ status: 200, msg: 'Your Price is added' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

// doctor update price of service
export const updateDoctorPrice = async (req, res) => {
    const doctorId = +req.params.doctorId;
    const serviceId = +req.params.serviceId;
    const { yourPrice } = req.body;
    try {
        if (!yourPrice) {
            return res.status(400).json({ status: 400, msg: 'Your Price is required' })
        }
        const updatePrice = await prisma.doctorPrice.update({
            where: {
                doctorId_serviceId: { doctorId, serviceId },

            },
            data: { yourPrice }
        })
        res.status(200).json({ status: 200, msg: 'Your Price is updated' })

    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

// get doctor Price 
export const getDoctorPrice = async (req, res) => {
    const doctorId = +req.params.doctorId;
    const serviceId = +req.params.serviceId;
    try {
        const yourPrice = await prisma.doctorPrice.findUnique({
            where: {
                doctorId_serviceId: { doctorId, serviceId }
            }
        })
        res.status(200).json({ status: 200, yourCharges: yourPrice })

    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

// post ticket
export const recentTicket = async (req, res) => {
    const { title, description } = req.body
    const fileInfo = req.file
    const patientId = +req.params.patientId
    try {

        if (!title || !description) {
            return res.status(400).json({ msg: 400, msg: 'All fields are required' })
        }
        if (!patientId) {
            return res.status(400).json({ msg: 400, msg: 'Patient id is required' })
        }

        const fileType = fileInfo.mimetype == 'image/jpeg' || fileInfo.mimetype == 'image/png'
        const fileSize = fileInfo.size / (1024 * 1024) <= 2

        if (!fileType || !fileSize) {
            return res.status(400).json({ status: 400, msg: 'Image type must be JPG/PNG and size less than 2MB' })
        }

        const data = { patientId, title, description, imageUrl: fileInfo.path }
        const save = await prisma.recentTicket.create({ data })
        res.status(201).json({ status: 201, msg: 'Ticket added Successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Sometging went wrong' })
    }
}

// get all recent ticket 
export const getAllRecentTicket = async (req, res) => {
    try {
        const tickets = await prisma.recentTicket.findMany({
            select: {
                id: true,
                title: true,
                description: true,
                imageUrl: true,
                createdAt: true,
                updatedAt: true,

                Patient: {
                    select: {
                        patientName: true,
                        profileUrl: true,
                    },
                },
            },
        });

        if (tickets.length === 0) {
            return res.status(404).json({ status: 404, msg: 'No Ticket Founnd' })
        }

        res.status(200).json({ status: 200, msg: tickets });
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: 500, msg: 'Something went wrong' });
    }
};

// get ticket from ticket id 
export const getRecentTicketById = async (req, res) => {
    const ticketId = +req.params.ticketId
    try {
        const ticket = await prisma.recentTicket.findUnique({
            where: { id: ticketId },
            select: {
                id: true,
                title: true,
                description: true,
                imageUrl: true,
                createdAt: true,
                updatedAt: true,

                Patient: {
                    select: {
                        patientName: true,
                        profileUrl: true,
                    },
                },
            },
        });

        if (!ticket) {
            return res.status(404).json({ status: 404, msg: 'Ticket not found' });
        }
        res.status(200).json({ status: 200, msg: ticket });
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: 500, msg: 'Something went wrong' });
    }
};



// get trending consultant
export const trendingConsultant = async (req, res) => {
    try {
        const consultants = await prisma.doctor.findMany({ where: { verified: 'yes' }, orderBy: { noOfBooking: 'desc' } })
        res.status(200).json({ status: 200, consultants })

    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, consultants })
    }
}


// get alll doctors
export const allDoctors = async (req, res) => {
    try {
        const allDoctors = await prisma.doctor.findMany({ where: { verified: 'yes' } })
        const doctorsCount = allDoctors.length
        const data = { allDoctors, doctorsCount }

        if (allDoctors.length === 0) {
            return res.status(404).json({ status: 404, msg: 'No Counsultant Found' })
        }

        res.status(200).json({ status: 200, data })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })

    }
}

// app --  search doctor and services
export const searchDoctorAndServices = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            res.status(400).json({ status: 400, msg: 'Search query is required' })
        }

        // Search for doctors 
        const doctors = await prisma.doctor.findMany({
            where: {
                OR: [
                    { doctor_name: { contains: query, mode: 'insensitive' } },
                    { username: { contains: query, mode: 'insensitive' } }
                ],
            },
        });


        // Search for services 
        const services = await prisma.service.findMany({
            where: {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { tags: { has: query } },
                    { benefits: { has: query } },
                    { what_we_will_discuss: { has: query } },
                ],
            },
        });



        if (doctors.length === 0 && services.length === 0) {
            return res.status(404).json({ status: 404, msg: 'No result found please try again' });
        }

        res.status(200).json({ status: 200, doctors, services })

    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

// support system 
export const patientSupport = async (req, res) => {
    try {
        const patientId = +req.params.patientId;
        const { title, description } = req.body;
        const fileInfo = req.file;
        if (!title) {
            return res.status(400).json({ status: 400, msg: 'Title is required' })
        }
        const fileType = fileInfo.mimetype == 'image/jpeg' || fileInfo.mimetype == 'image/png'
        const fileSize = fileInfo.size / (1024 * 1024) <= 2

        if (!fileType || !fileSize) {
            return res.status(400).json({ status: 400, msg: 'Image type must be JPG/PNG and size less than 2MB' })
        }

        const data = { patientId, title, description, image: fileInfo.path }
        const saveData = await prisma.support.create({ data })
        res.status(201).json({ status: 201, msg: 'Support Added', saveData })

    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

// to delete support 
export const deletePatientSupport = async (req, res) => {
    try {
        const supportId = +req.params.supportId
        const deleteSupport = await prisma.support.delete({ where: { id: supportId } })
        res.status(200).json({ status: 200, msg: 'Support deleted' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}
// get support patient specific
export const patientAllSupport = async (req, res) => {
    try {
        const patientId = +req.params.patientId
        const allSupport = await prisma.support.findMany({ where: { patientId } })
        if (allSupport.length === 0) {
            return res.status(404).json({ status: 404, msg: 'No Support Found' })
        }
        res.status(200).json({ status: 200, allSupport })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}
// get particular support 
export const eachSupport = async (req, res) => {
    try {

        const supportId = + req.params.supportId
        const support = await prisma.support.findUnique({ where: { id: supportId } })
        res.status(200).json({ status: 200, support })
    } catch (error) {
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

// to update support 
export const updateSupport = async (req, res) => {
    try {
        const supportId = +req.params.supportId
        const { title, description } = req.body
        const fileInfo = req.file

        const updatedData = {}
        if (title) {
            updatedData.title = title
        }
        if (description) {
            updatedData.description = description
        }
        if (fileInfo) {
            const fileType = fileInfo.mimetype == 'image/jpeg' || fileInfo.mimetype == 'image/png'
            const fileSize = fileInfo.size / (1024 * 1024) <= 2

            if (!fileType || !fileSize) {
                return res.status(400).json({ status: 400, msg: 'Image type must be JPG/PNG and size less than 2MB' })
            }

            updatedData.image = fileInfo.path
        }

        if (Object.keys(updatedData).length === 0) {
            return res.status(400).json({ status: 400, msg: 'No valid fields to update' });
        }

        const updatedSupport = await prisma.support.update({
            where: { id: supportId },
            data: updatedData,
        });

        res.status(200).json({ status: 200, msg: 'Support updated' });
    } catch (error) {
        res.status(500).json({ status: 500, msg: 'Something went wrong', error: error.message });
    }
}


// admin dashboard search bar (staff,services,content)
export const adminSearchBar = async (req, res) => {
    try {

        const { query } = req.query

        if (!query) {
            return res.status(400).json({ status: 400, msg: 'Search Query is required' })
        }

        const doctor = await prisma.doctor.findMany({
            where: {
                OR: [
                    { doctor_name: { contains: query, mode: 'insensitive' } },
                    { username: { contains: query, mode: 'insensitive' } },
                ]
            }
        })

        const manager = await prisma.manager.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { username: { contains: query, mode: 'insensitive' } },
                    { states: { has: query } },
                    { countries: { has: query } }
                ]
            }
        })


        const creator = await prisma.creator.findMany({
            where: {
                OR: [
                    { username: { contains: query, mode: 'insensitive' } },
                    { country: { contains: query, mode: 'insensitive' } },
                    { state: { contains: query, mode: 'insensitive' } },
                    { language: { has: query } }

                ]
            }
        })

        const categories = await prisma.category.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } }
                ]
            }
        })

        const services = await prisma.service.findMany({
            where: {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { tags: { has: query } },
                    { subtitle: { has: query } },
                    { what_we_will_discuss: { has: query } },
                    { benefits: { has: query } },
                    { language: { contains: query, mode: 'insensitive' } },
                ]
            }
        })

        const articles = await prisma.article_content.findMany({
            where: {
                OR: [
                    { heading: { contains: query, mode: 'insensitive' } },
                    { content: { contains: query, mode: 'insensitive' } },
                    { tags: { has: query } },
                    { category: { has: query } }
                ]
            }
        })

        const blogs = await prisma.blog_content.findMany({
            where: {
                OR: [
                    { content: { contains: query, mode: 'insensitive' } },
                    { tags: { has: query } },
                    { category: { has: query } }
                ]
            }
        })

        const ytContent = await prisma.yt_content.findMany({
            where: {
                OR: [
                    { heading: { contains: query, mode: 'insensitive' } },
                    { content: { contains: query, mode: 'insensitive' } },
                    { tags: { has: query } },
                    { category: { has: query } }
                ]
            }
        })

        if (doctor.length === 0 && manager.length === 0 && creator.length === 0 && categories.length === 0 && services.length === 0 && articles.length === 0 && blogs.length === 0 && ytContent.length === 0) {
            return res.status(404).json({ status: 404, msg: 'No result found' })
        }

        res.status(200).json({ status: 200, doctor, manager, creator, categories, services, articles, blogs, ytContent, })

    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}


// manager dashboard search bar
export const managerSearchBar = async (req, res) => {
    const { managerId } = req.params;
    const { query } = req.query;

    try {
        const managerDetails = await prisma.manager.findUnique({
            where: { id: parseInt(managerId) },
            include: {
                doctors: {
                    where: {
                        OR: [
                            { doctor_name: { contains: query, mode: 'insensitive' } },
                            { email: { contains: query, mode: 'insensitive' } },
                            { doctorServices: { some: { service: { title: { contains: query, mode: 'insensitive' } } } } }
                        ],
                    },
                    select: {
                        doctor_name: true,
                        email: true,
                        noOfBooking: true,
                        doctorServices: {
                            include: { service: true }
                        },
                    },
                },
                creators: {
                    where: {
                        OR: [
                            { username: { contains: query, mode: 'insensitive' } },
                            { email: { contains: query, mode: 'insensitive' } },
                            { yt_contents: { some: { heading: { contains: query, mode: 'insensitive' } } } },
                            { blog_contents: { some: { tags: { has: query } } } },
                            { article_content: { some: { heading: { contains: query, mode: 'insensitive' } } } },
                        ],
                    },
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        yt_contents: true,
                        blog_contents: true,
                        article_content: true,
                    },
                },
            },
        });

        if (!managerDetails) {
            return res.status(404).json({ status: 404, msg: 'Results not found' });
        }
        res.status(200).json({ status: 200, managerDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, msg: 'Something went wrong' });
    }
}


//get doctor profile
export const getDoctorProfile = async (req, res) => {
    try {
        const doctorId = +req.params.doctorId;
        const profile = await prisma.doctor.findUnique({ where: { id: doctorId }, include: { doctorServices: true } })
        res.status(200).json({ status: 200, profile })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

// add service
export const addDoctorService = async (req, res) => {
    const serviceId = +req.params.serviceId
    const doctorId = +req.params.doctorId
    try {
        // Validate that the doctorId and serviceId exist
        const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
        const service = await prisma.service.findUnique({ where: { id: serviceId } });

        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }

        if (!service) {
            return res.status(404).json({ msg: 'Service not found' });
        }

        const doctorService = await prisma.doctorService.create({
            data: {
                doctorId,
                serviceId
            },
        })
        return res.status(201).json({ status: 201, message: 'Service added successfully', doctorService });
    } catch (error) {
        console.error('Error adding service:', error);
        return res.status(500).json({ status: 500, msg: 'Something went wrong' });
    }
}

// get upcoming session of doctor
export const upcomingSession = async (req, res) => {
    try {
        const doctorId = +req.params.doctorId;
        const currentDateTime = new Date();

        const startOfDay = new Date(currentDateTime);
        startOfDay.setHours(0, 0, 0, 0)

        const endOfDay = new Date(currentDateTime)
        endOfDay.setHours(23, 59, 59, 999)

        const sessions = await prisma.booking.findMany({
            where: {
                doctorId, isCompleted: 'no',
                slotStart: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                Patient: true,
                Service: {
                    select: {
                        title: true
                    }
                }
            },
            orderBy: {
                slotStart: 'asc'
            }
        })

        if (sessions.length === 0) {
            return res.status(400).json({ status: 400, msg: 'No sessions for today' });
        }

        const sessionCount = sessions.length
        res.status(200).json({ status: 200, upcomingSession: sessions, upcomingSessionCount: sessionCount })

    } catch (error) {
        console.log(error);
        res.status(500).json({ status: 500, msg: 'Something went wrong' });
    }
};


// get service from its id 
export const getServiceFromId = async (req, res) => {
    try {
        const serviceId = +req.params.serviceId
        const service = await prisma.service.findUnique({ where: { id: serviceId } })
        res.status(200).json({ status: 200, service })

    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

// get service from doctor id 
export const getServicesByDoctorId = async (req, res) => {
    try {
        const { doctorId } = req.params

        const doctorServices = await prisma.doctorService.findMany({
            where: { doctorId: parseInt(doctorId) },
            include: {
                service: {
                    include: {
                        Category: {
                            select: {
                                name: true
                            }
                        },
                        doctorPrice: {
                            where: {
                                doctorId: parseInt(doctorId)
                            },
                            select: {
                                yourPrice: true
                            }
                        }
                    }
                }
            },
        })

        if (doctorServices.length === 0) {
            return res.status(404).json({ message: 'No services found for this doctor' });
        }

        return res.status(200).json(doctorServices)

    } catch (error) {
        console.error('Error retrieving services by doctorId:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// get doctor by service id 
export const getDoctorsByServiceId = async (req, res) => {
    try {
        const { serviceId } = req.params;

        // Find doctors related to the service
        const serviceDoctors = await prisma.doctorService.findMany({
            where: { serviceId: parseInt(serviceId) },
            include: {
                doctor: true,
            },
        })

        if (serviceDoctors.length === 0) {
            return res.status(404).json({ message: 'No doctors found for this service' });
        }

        return res.status(200).json(serviceDoctors);
    } catch (error) {
        console.error('Error retrieving doctors by serviceId:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export const allYt = async (req, res) => {
    try {
        const yt = await prisma.yt_content.findMany({ where: { verified: 'publish' } })
        res.status(200).json({ status: 200, yt })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

export const allArticle = async (req, res) => {
    try {
        const article = await prisma.article_content.findMany({ where: { verified: 'publish' } })
        res.status(200).json({ status: 200, article })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

export const allBlog = async (req, res) => {
    try {
        const blog = await prisma.blog_content.findMany({ where: { verified: 'publish' } })
        const blogDataArray = blog.map(blog => {
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

        res.status(200).json({ status: 200, blog: blogDataArray });

    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' });

    }
}


// for registration of doctor
export const registerDoctor = async (req, res) => {
    const { username, email, doctorName, password, fcmToken } = req.body
    try {
        const requiredField = ['username', 'email', 'doctorName', 'password', 'fcmToken']
        for (const field of requiredField) {
            if (req.body[field] === undefined || req.body[field] === '' || req.body[field] === null) {
                return res.status(400).json({ status: 400, msg: `${field} is required` })
            }
        }

        const isDoctor = await prisma.doctor.findUnique({ where: { email } })
        if (isDoctor) {
            return res.status(400).json({ status: 400, msg: 'Doctor with this mail is already present' })
        }
        const isUsername = await prisma.doctor.findUnique({ where: { username } })
        if (isUsername) {
            return res.status(400).json({ status: 400, msg: `${username} is not available` })
        }


        const salt = bcrypt.genSaltSync(10)
        const hash_pswd = bcrypt.hashSync(password, salt)


        const otpNumber = Math.floor(1000 + Math.random() * 9000).toString();
        const otpToken = jwt.sign({ otpNumber }, process.env.SECRET_KEY, { expiresIn: '2m' })

        const data = { username, doctorName, password: hash_pswd, email, fcmToken, otp: otpToken }

        const mailOptions = {
            from: process.env.ADMIN_EMAIL,
            to: email,
            subject: 'Your One-Time Password (OTP) for Verification',
            html: `
                             <p>Hello  ${doctorName} </p>
                             <p>Thank you for signing up. Please use the following OTP to verify your email address. This OTP is valid for 2 minutes.</p>
                             <h3>${otpNumber}</h3>
                             <p>If you did not request this, please contact our support team immediately at support@example.com.</p>
                             <p><a href="https://phoenix-sage.vercel.app/">Visit Our website</a></p>
                             <p>Follow us on Social Media:<br/>
                             <img src="cid:insta" alt="insta icon" style="width: 30px; height: 30px;" />
                             <img src="cid:fb" alt="fb icon" style="width:30px; height:30px" />
                             <img src="cid:yt" alt="yt icon" style="width:30px; height:30px" />
                             </p>
                             <p>Best regards,<br>Kanika Jindal<br>Founder<br>example@gmail.com</p>
                         `,
            attachments: [
                {
                    filename: 'insta_logo.png',
                    path: path.join(__dirname, 'attachements', 'insta_logo.png'),
                    cid: 'insta'
                },
                {
                    filename: 'fb_logo.png',
                    path: path.join(__dirname, 'attachements', 'fb_logo.png'),
                    cid: 'fb'
                },
                {
                    filename: 'yt_logo.png',
                    path: path.join(__dirname, 'attachements', 'yt_logo.jpeg'),
                    cid: 'yt'
                }
            ]
        }
        const mailSent = transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                return res.status(400).json({ msg: 'OTP not sent' })
            } else {
                await prisma.doctor.create({ data })
                return res.status(200).json({ status: 200, msg: 'OTP sent check your Email' })
            }
        })

    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

// to verify otp 
export const verifyDoctorOtp = async (req, res) => {
    const { otp, email } = req.body
    try {

        const isDoctor = await prisma.doctor.findUnique({ where: { email } })
        if (!isDoctor) {
            return res.status(404).json({ status: 404, msg: 'Doctor is not found with this email' })
        }
        const realOtp = isDoctor.otp;
        const decodeOtp = jwt.verify(realOtp, process.env.SECRET_KEY)
        if (otp !== decodeOtp.otpNumber) {
            await prisma.doctor.delete({ where: { email } })
            return res.status(400).json({ status: 400, msg: 'OTP is invalid or expired' })
        }

        const saveData = await prisma.doctor.update({ where: { email }, data: { emailVerified: 'yes' } })
        const tokenData = { username: saveData.username, name: saveData.doctorName }
        const token = jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: '999h' })
        res.status(200).json({ status: 200, msg: 'Email is verified', doctorId: saveData.id, token })

    } catch (error) {
        console.log(error.message)
        if (error.message === 'jwt expired') {
            await prisma.doctor.delete({ where: { email } })
            return res.status(400).json({ status: 400, msg: 'OTP is invalid or expired' })
        }
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

// to complete doctor profile



// sign in doctor from google 
export const signInDoctorFromGoogle = async (req, res) => {
    const { username, email, profileUrl, fcmToken } = req.body;
    try {
        const requiredFields = ['username', 'email', 'fcmToken'];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({ status: 400, msg: `${field} is required` });
            }
        }
        let doctor = await prisma.doctor.findUnique({ where: { email } })
        const data = { username, email, profileUrl, fcmToken }

        if (doctor) {
            const updateDocotor = await prisma.doctor.update({
                where: { email },
                data: { fcmToken }
            })
            const token = jwt.sign({ token: updateDocotor }, process.env.SECRET_KEY, { expiresIn: '999h' })
            return res.status(200).json({ status: 200, msg: 'Token refreshed', token, id: updateDocotor.id });
        } else {
            const saveDoctor = await prisma.doctor.create({ data })
            const newToken = jwt.sign({ token: saveDoctor }, process.env.SECRET_KEY, { expiresIn: '999h' })
            return res.status(201).json({ status: 201, msg: 'Profile created successfully', token: newToken, id: saveDoctor.id });
        }
    } catch (error) {
        res.status(500).json({ status: 500, msg: error.message });
    }
}

// login doctor
export const doctorLogin = async (req, res) => {
    try {
        const { email, password, fcmToken } = req.body
        console.log(fcmToken)
        const doctor = await prisma.doctor.findUnique({ where: { email } })
        if (doctor) {
            var isPassword = bcrypt.compareSync(password, doctor.password)
        }

        if ((!doctor) || (!isPassword)) {
            return res.status(404).json({ message: 'Incorrect Credentials!' })
        }

        // sending info. for client
        const forClient = {
            role: doctor.role,
            id: doctor.id,
            username: doctor.username,
            doctor_name: doctor.doctorName,
            state: doctor.state,
            languages: doctor.languages,
            specialities: doctor.specialities,
            experience: doctor.experience,
            maximum_education: doctor.maximumEducation,
            profile_pic: doctor.profile_pic
        }

        const token = jwt.sign(forClient, process.env.SECRET_KEY, { expiresIn: '999h' })
        const updateFcm = await prisma.doctor.update({ where: { email }, data: { fcmToken } })
        res.status(200).json({ status: 200, msg: 'LoggedIn succesfully', token })

    } catch (error) {
        console.log(error)
    }
}



// // delete profile
export const deleteDoctor_profile = async (req, res) => {

    try {
        const DoctorId = +req.params.DoctorId;

        const isDoctor = await prisma.doctor.findUnique({ where: { id: DoctorId } })
        if (!isDoctor) {
            res.status(404).json({ message: 'Doctor is not found' })
        }

        const info = await prisma.doctor.delete({ where: { id: DoctorId } })

        res.status(200).json({ message: 'Your Profile deleted succesfully' })

    } catch (error) {
        res.send(error)
        console.log(error)
    }


}

// update status iff verified == yes
export const updateDoctorStatus = async (req, res) => {
    try {
        const DoctorId = +req.params.DoctorId;
        const { status } = req.body;

        const isDoctor = await prisma.doctor.findUnique({ where: { id: DoctorId } })
        if (!isDoctor) {
            res.status(404).json({ message: 'Something went wrong' })
        }
        if (isDoctor.verified == 'no') {
            res.status(400).json({ message: 'You are not verified' })
        }
        const updateStatus = await prisma.doctor.update({ where: { id: DoctorId }, data: { status } })

        res.status(200).json({ message: `Your status updated to ${status}` })

    } catch (error) {
        res.status(400).json({ message: 'something went wrong' })
        console.log(error)
    }
}

// update remarks iff verified == yes 
export const updateDoctorRemarks = async (req, res) => {
    try {
        const DoctorId = +req.params.DoctorId;
        const { remarks } = req.body;

        const isDoctor = await prisma.doctor.findUnique({ where: { id: DoctorId } })
        if (!isDoctor) {
            res.status(404).json({ message: 'Something went wrong' })
        }
        if (isDoctor.verified == 'no') {
            res.status(400).json({ message: 'You are not verified' })
        }
        const updateStatus = await prisma.doctor.update({ where: { id: DoctorId }, data: { remarks } })

        res.status(200).json({ message: 'Remarks is updated' })

    } catch (error) {
        res.status(400).json({ message: 'something went wrong' })
        console.log(error)
    }
}

// doctor update avalabilty
export const updateAvailability = async (req, res) => {
    const doctorId = +req.params.doctorId;
    const { availability } = req.body;
    console.log(availability)

    try {
        if (!availability) {
            return res.status(400).json({ status: 400, msg: 'Availability is required' });
        }

        // Parse availability if it is a string
        let parsedAvailability;
        try {
            parsedAvailability = JSON.parse(availability);
        } catch (e) {
            return res.status(400).json({ status: 400, msg: 'Invalid availability format' });
        }

        // Convert the date strings to ISO-8601 format and subtract 5:30:00
        const transformedAvailability = parsedAvailability.map(slot => {
            const startTime = new Date(new Date(slot.startTime).getTime() - 5.5 * 60 * 60 * 1000); // Subtract 5 hours and 30 minutes
            const endTime = new Date(new Date(slot.endTime).getTime() - 5.5 * 60 * 60 * 1000); // Subtract 5 hours and 30 minutes

            return {
                doctorId,
                startTime: startTime.toISOString(), // Convert to ISO-8601 after time adjustment
                endTime: endTime.toISOString() // Convert to ISO-8601 after time adjustment
            }
        })

        // Save the availability
        const availableSlots = await prisma.doctorAvailability.createMany({
            data: transformedAvailability
        });

        res.status(200).json({ status: 200, msg: 'Availability updated', availableSlots });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, msg: 'Error updating availability' });
    }
}


// get available slots of particular docotor
export const getAvailableSlotsDoctor = async (req, res) => {
    const doctorId = +req.params.doctorId
    try {
        const availableSlots = await prisma.doctorAvailability.findMany({ where: { doctorId } })
        res.status(200).json({ status: 200, msg: availableSlots })
    } catch (error) {
        res.status(500).json({ error: 'Error fetching available slots' });
        console.log(error.message);
    }
}



// to book slot 
export const bookSlot = async (req, res) => {
    const { slotStart, slotEnd, channelName, notes } = req.body;
    const serviceId = +req.params.serviceId;
    const patientId = +req.params.patientId;
    const doctorId = +req.params.doctorId;

    console.log("from frontend", slotStart, slotEnd)

    try {
        const slotStartTime = new Date(new Date(slotStart).getTime() - 5.5 * 60 * 60 * 1000)
        const slotEndTime = new Date(new Date(slotEnd).getTime() - 5.5 * 60 * 60 * 1000)
        console.log("after adjust ", slotStartTime, slotEndTime)
        const slotStartTimeISO = new Date(slotStart).toISOString();
        const slotEndTimeISO = new Date(slotEnd).toISOString();

        console.log("after iso", slotStartTimeISO, slotEndTimeISO)

        // Create a booking
        const booking = await prisma.booking.create({
            data: {
                patientId,
                doctorId,
                slotStart: slotStartTime.toISOString(),
                slotEnd: slotEndTime.toISOString(),
                channelName,
                serviceId,
                notes
            },
        })

        // mark slot as booked
        const markBooked = await prisma.availableSlots.update({
            where: {
                doctorId_startTime_endTime: {
                    doctorId,
                    startTime: slotStartTimeISO,
                    endTime: slotEndTimeISO,
                },
            },
            data: {
                isBooked: 'yes',
            },
        })


        // Extract and adjust times for the response
        const startDate = new Date(booking.slotStart);
        const endDate = new Date(booking.slotEnd);

        const adjustedStartDate = new Date(startDate.getTime() + 5.5 * 60 * 60 * 1000);
        const adjustedEndDate = new Date(endDate.getTime() + 5.5 * 60 * 60 * 1000);

        const formattedStartDate = adjustedStartDate.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });

        const formattedStartTime = adjustedStartDate.toLocaleString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
        });

        const formattedEndTime = adjustedEndDate.toLocaleString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
        });

        // Increment the noOfBooking for the doctor
        await prisma.doctor.update({
            where: { id: doctorId },
            data: {
                noOfBooking: { increment: 1 }
            },
        });

        // Notify the doctor
        const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
        const token = doctor.fcmToken
        const title = 'Appointment Booked'
        const body = `Appointment Booked on ${formattedStartDate} at ${formattedStartTime} - ${formattedEndTime}.`;
        await toDoctor(title, body, channelName, token);

        // Respond with success message and booking details
        res.status(200).json({
            status: 200,
            msg: 'Slot booked successfully',
            booking
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, msg: 'Error booking slot' });
    }
}


// get all available slots
export const getAllAvailableSlots = async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7); // End date (7 days from today)

    try {
        // Get all booked slots for the upcoming 7 days
        const bookedSlots = await prisma.booking.findMany({
            where: {
                slotStart: {
                    gte: today,
                    lt: nextWeek
                },
            },
            orderBy: {
                slotStart: 'asc'
            }
        });

        const availableSlots = [];
        const startHour = 9; // Start slots at 9 AM each day
        const endHour = 17; // End slots by 5 PM each day

        let currentDay = new Date(today);

        while (currentDay < nextWeek) {
            let currentStartTime = new Date(currentDay);
            currentStartTime.setHours(startHour, 0, 0, 0); // Set to 9:00 AM
            let currentEndTime = new Date(currentStartTime);
            currentEndTime.setHours(currentStartTime.getHours() + 1); // Slot duration is 1 hour

            // Loop through the day from 9 AM to 5 PM
            while (currentStartTime.getHours() < endHour) {
                const slotAvailable = bookedSlots.every(booked => {
                    const bookedStart = new Date(booked.slotStart);
                    const bookedEnd = new Date(booked.slotEnd);

                    return (
                        currentEndTime <= bookedStart || currentStartTime >= bookedEnd
                    );
                });

                if (slotAvailable) {
                    availableSlots.push({
                        startTime: currentStartTime.toISOString(),
                        endTime: currentEndTime.toISOString(),
                    });
                }

                // Move to the next slot with a 2-minute buffer
                currentStartTime = new Date(currentEndTime);
                currentStartTime.setMinutes(currentStartTime.getMinutes() + 2);
                currentEndTime = new Date(currentStartTime);
                currentEndTime.setHours(currentStartTime.getHours() + 1);
            }

            // Move to the next day
            currentDay.setDate(currentDay.getDate() + 1);
        }

        res.status(200).json({
            status: 200,
            availableSlots,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, msg: 'Error fetching available slots' });
    }
};


// doctor forgot password :
//  ------send otp to the doctor
export const DoctorOtpSend = async (req, res) => {
    try {
        const { email } = req.body;
        const isDoctor = await prisma.doctor.findUnique({ where: { email } })
        if (!isDoctor) {
            return res.status(404).json({ msg: "User not Found" })
        }
        // otp
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const otpToken = jwt.sign({ otp }, process.env.SECRET_KEY, { expiresIn: '2m' })
        // store otp in db
        const saveOtp = await prisma.doctor.update({ where: { email }, data: { otp: otpToken } })

        // send OTP via mail
        const mailOptions = {
            from: process.env.ADMIN_EMAIL,
            to: email,
            subject: 'OTP to reset Password',
            html:
                `
            Dear ${isDoctor.doctorName},

            <p>We received a request to change your password.To proceed, please use the One-Time Password (OTP) provided below. </p>

            <h3>Your OTP is ${otp}</h3>

            <p>This OTP is valid for the next 2 minutes. Please do not share this OTP with anyone, as it is for your personal use only.</p>

            <p>If you did not request, please contact our support team immediately at @example.com.</p>

             <p><a href="https://phoenix-sage.vercel.app/">Visit Our website</strong></a></p>

                      <p>Follow us on Social Meadia :<br/>
                     <img src="cid:insta" alt="insta icon" style="width: 30px; height: 30px;" />
                      <img src="cid:fb" alt="fb icon" style="width:30px; height:30px" />
                      <img src="cid:yt" alt="yt icon" style="width:30px; height:30px" />
                          </p>
                      <p>Best regards,<br>Kanika Jindal<br>Founder<br>example@gmail.com</p>
            `,
            attachments: [
                {
                    filename: 'insta_logo.png',
                    path: path.join(__dirname, 'attachements', 'insta_logo.png'),
                    cid: 'insta'
                },
                {
                    filename: 'fb_logo.png',
                    path: path.join(__dirname, 'attachements', 'fb_logo.png'),
                    cid: 'fb'
                },
                {
                    filename: 'yt_logo.png',
                    path: path.join(__dirname, 'attachements', 'yt_logo.jpeg'),
                    cid: 'yt'
                }
            ]
        }
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                res.status(400).json({ status: 400, msg: 'OTP not Sent' })
            }
            else {
                res.status(200).json({ status: 200, msg: 'OTP sent Successfully' })
            }
        })
    } catch (error) {
        res.status(400).json({ message: 'Something went wromg' })
        console.log(error)
    }
}

// doctor verify otp :  
export const doctorVerifyForgotOtp = async (req, res) => {
    const { otp, email } = req.body
    try {
        if (!otp) {
            return res.status(400).json({ status: 400, msg: 'OTP is required' })
        }
        const checkOtp = await prisma.doctor.findUnique({ where: { email } })

        if (!checkOtp) {
            return res.status(400).json({ msg: 'Invalid Or Expired OTP' })
        }

        if (checkOtp.otp === null) {
            return res.status(400).json({ status: 400, msg: 'Invalid Email or OTP' })
        }

        // verify otp
        const decodedOtp = jwt.verify(checkOtp.otp, process.env.SECRET_KEY)

        if (decodedOtp.otp !== otp) {
            return res.status(400).json({ status: 400, msg: 'Invalid OTP' })
        }
        res.status(200).json({ status: 200, msg: 'OTP is verified' })
    } catch (error) {
        console.log(error)
        if (error.message === 'jwt expired') {
            return res.status(400).json({ status: 400, msg: 'OTP is invalid or expired' })
        }
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

// reset doctor password 
export const resetDoctorPassword = async (req, res) => {
    const { newPassword, email } = req.body
    try {
        if (!newPassword) {
            return res.status(400).json({ status: 200, msg: 'New Password is required' })
        }
        //  hash password
        const salt = bcrypt.genSaltSync(10)
        const hash_pass = bcrypt.hashSync(newPassword, salt)
        const updatePswd = await prisma.doctor.update({ where: { email }, data: { password: hash_pass } })
        res.status(200).json({ status: 200, msg: 'Password reset Succesfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}




// to get category from doctor id 
export const getCategoriesByDoctorId = async (req, res) => {
    const { doctorId } = req.params;
    try {
        const services = await prisma.doctorService.findMany({
            where: { doctorId: parseInt(doctorId) },
            select: { serviceId: true }
        });

        const categoryIds = [...new Set(services.map(service => service.serviceId))];

        const categories = await prisma.category.findMany({
            where: {
                id: {
                    in: categoryIds
                }
            }
        });

        return res.status(200).json({ status: 200, categories });
    } catch (error) {
        console.error('Error retrieving categories:', error);
        return res.status(500).json({ status: 500, msg: 'Something went wrong' });
    }
}

// complete doctor profile
export const completeDoctorProfile = async (req, res) => {
    const { country, contactNumber, state, languages, experience, maximumEducation, pricePerSession, gender } = req.body;
    const fileInfo = req.files;
    const doctorId = parseInt(req.params.doctorId)

    try {
        // Check for required fields
        const requiredFields = ['country', 'contactNumber', 'state', 'languages', 'experience', 'maximumEducation', 'pricePerSession', 'gender'];

        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({ status: 400, msg: `${field} is required` });
            }
        }

        // Ensure files are present
        if (!fileInfo || !fileInfo.doctorProfile || !fileInfo.doctorDocument) {
            return res.status(400).json({ status: 400, msg: 'Profile photo and document are required' });
        }

        // Profile pic info
        const doctorProfile = fileInfo.doctorProfile[0];
        const doctorProfile_path = doctorProfile.path;
        const doctorProfile_type = doctorProfile.mimetype;
        const doctorProfile_size = doctorProfile.size / (1024 * 1024); // size in MB

        // Document info
        const doctorDocument = fileInfo.doctorDocument[0];
        const doctorDocument_path = doctorDocument.path;
        const doctorDocument_type = doctorDocument.mimetype;
        const doctorDocument_size = doctorDocument.size / (1024 * 1024); // size in MB

        // Validate profile pic
        const isProfilePic = (doctorProfile_type === 'image/jpeg' || doctorProfile_type === 'image/png') && (doctorProfile_size <= 2);
        if (!isProfilePic) {
            return res.status(400).json({ status: 400, msg: 'Profile photo must be jpg or png and size less than 2MB' });
        }

        // Validate document
        const isDocument = (doctorDocument_type === 'application/zip') && (doctorDocument_size <= 20);
        if (!isDocument) {
            return res.status(400).json({ status: 400, msg: 'Document must be a zip file and size not greater than 20MB' });
        }

        const data = {
            country,
            contactNumber,
            state,
            languages,
            experience,
            maximumEducation,
            pricePerSession,
            gender,
            profileUrl: doctorProfile_path,
            documents: doctorDocument_path,
        }
        const saveData = await prisma.doctor.update({ where: { id: doctorId }, data })

        // send notification to the admin
        const sendNotificationToAdmin = await prisma.adminNotifications.create({
            data: {
                adminId: 1,
                title: `Doctor ${saveData.doctorName} has requested approval`,
                content: `Doctor ${saveData.doctorName} has requested approval for their profile`,
                data: JSON.stringify({
                    doctorId:saveData.id,
                }),
            },
        })
        res.status(200).json({ status: 200, msg: 'Profile completed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, msg: 'Something went wrong' });
    }
}

export const registerPatient = async (req, res) => {
    const { dob, contactNumber, country, gender, email, patientName, password, fcmToken } = req.body
    console.log(req.body)
    const fileInfo = req.file
    try {
        const requiredField = ['dob', 'gender', 'country', 'contactNumber', 'email', 'patientName', 'password', 'fcmToken']
        for (const field of requiredField) {
            console.log(`${field}:`, req.body[field]);
            if (req.body[field] === undefined || req.body[field] === '' || req.body[field] === null) {
                return res.status(400).json({ status: 400, msg: `${field} is required` })
            }
        }

        if (!fileInfo) {
            return res.status(400).json({ status: 400, msg: 'Profile Image is required' })
        }

        const fileType = fileInfo.mimetype
        const fileSizeMB = fileInfo.size / (1024 * 1024)
        const isImage = (fileType === 'image/jpeg' || fileType === 'image/png') && fileSizeMB <= 2
        if (!isImage) {
            return res.status(400).json({
                status: 400,
                msg: 'Profile Image must  be a JPG or PNG image and size must be less than 2MB',
            })
        }

        const isPatient = await prisma.patient.findUnique({ where: { email } })
        if (isPatient) {
            return res.status(400).json({ status: 400, msg: 'Patient with this mail is already present' })
        }

        const salt = bcrypt.genSaltSync(10)
        const hash_pswd = bcrypt.hashSync(password, salt)

        const otpNumber = Math.floor(1000 + Math.random() * 9000).toString();
        const otpToken = jwt.sign({ otpNumber }, process.env.SECRET_KEY, { expiresIn: '2m' })

        const data = { dob, contactNumber, profileUrl: fileInfo.path, country, gender, patientName, password: hash_pswd, email, fcmToken, otp: otpToken }
        const mailOptions = {
            from: process.env.ADMIN_EMAIL,
            to: email,
            subject: 'Your One-Time Password (OTP) for Verification',
            html: `
                             <p>Hello  ${patientName} </p>
                             <p>Thank you for signing up. Please use the following OTP to verify your email address. This OTP is valid for 2 minutes.</p>
                             <h3>${otpNumber}</h3>
                             <p>If you did not request this, please contact our support team immediately at support@example.com.</p>
                             <p><a href="https://phoenix-sage.vercel.app/">Visit Our website</a></p>
                             <p>Follow us on Social Media:<br/>
                             <img src="cid:insta" alt="insta icon" style="width: 30px; height: 30px;" />
                             <img src="cid:fb" alt="fb icon" style="width:30px; height:30px" />
                             <img src="cid:yt" alt="yt icon" style="width:30px; height:30px" />
                             </p>
                             <p>Best regards,<br>Kanika Jindal<br>Founder<br>example@gmail.com</p>
                         `,
            attachments: [
                {
                    filename: 'insta_logo.png',
                    path: path.join(__dirname, 'attachements', 'insta_logo.png'),
                    cid: 'insta'
                },
                {
                    filename: 'fb_logo.png',
                    path: path.join(__dirname, 'attachements', 'fb_logo.png'),
                    cid: 'fb'
                },
                {
                    filename: 'yt_logo.png',
                    path: path.join(__dirname, 'attachements', 'yt_logo.jpeg'),
                    cid: 'yt'
                }
            ]
        }

        const mailSent = transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                return res.status(400).json({ msg: 'OTP not sent' })
            } else {
                await prisma.patient.create({ data })
                return res.status(200).json({ status: 200, msg: 'OTP sent check your Email' })
            }
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

export const verifyPatientOtp = async (req, res) => {
    const { otp, email } = req.body
    try {
        const isPatient = await prisma.patient.findUnique({ where: { email } })
        if (!isPatient) {
            return res.status(404).json({ status: 404, msg: 'Patient is not found with this email' })
        }
        const realOtp = isPatient.otp
        const decodeOtp = jwt.verify(realOtp, process.env.SECRET_KEY)
        if (otp !== decodeOtp.otpNumber) {
            await prisma.patient.delete({ where: { email } })
            return res.status(400).json({ status: 400, msg: 'OTP is invalid or expired' })
        }
        const saveData = await prisma.patient.update({ where: { email }, data: { emailVerified: 'yes' } })
        const tokenData = { username: saveData.username, name: saveData.patientName }
        const token = jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: '999h' })
        res.status(200).json({ status: 200, msg: 'Email is verified', doctorId: saveData.id, token })
    } catch (error) {
        console.log(error.message)
        if (error.message === 'jwt expired') {
            await prisma.patient.delete({ where: { email } })
            return res.status(400).json({ status: 400, msg: 'OTP is invalid or expired' })
        }
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}


// get splits slots
export const getOneHourSlots = async (req, res) => {
    const doctorId = +req.params.doctorId;

    try {

        const availabilities = await prisma.doctorAvailability.findMany({
            where: { doctorId: doctorId },
        })

        let oneHourSlots = []
        const now = moment()
        console.log("==========check moment time ---------------------", now.toISOString());

        for (const availability of availabilities) {
            const { startTime, endTime } = availability;


            const adjustedStart = moment(startTime).add(5, 'hours').add(30, 'minutes');
            const adjustedEnd = moment(endTime).add(5, 'hours').add(30, 'minutes');

            let currentSlotStart = adjustedStart.clone();

            while (currentSlotStart.isBefore(adjustedEnd)) {
                const slotEndTime = currentSlotStart.clone().add(1, 'hours');
                const slotStartTimeISO = currentSlotStart.toISOString();
                const slotEndTimeISO = slotEndTime.toISOString();


                if (currentSlotStart.isBefore(now) || currentSlotStart.isSame(now, 'hour')) {
                    currentSlotStart.add(1, 'hours');
                    continue;
                }


                const existingSlot = await prisma.availableSlots.findUnique({
                    where: {
                        doctorId_startTime_endTime: {
                            doctorId: doctorId,
                            startTime: slotStartTimeISO,
                            endTime: slotEndTimeISO,
                        },
                    },
                })


                if (!existingSlot) {
                    oneHourSlots.push({
                        startTime: slotStartTimeISO,
                        endTime: slotEndTimeISO,
                        doctorId: doctorId,
                        isBooked: "no",
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });
                }

                currentSlotStart.add(1, 'hours');
            }
        }


        if (oneHourSlots.length > 0) {
            await prisma.availableSlots.createMany({
                data: oneHourSlots,
                skipDuplicates: true,
            });
        }


        const availableSlots = await prisma.availableSlots.findMany({
            where: {
                doctorId: doctorId,
                isBooked: "no",
                startTime: {
                    gte: moment().add(5, 'hours').add(30, 'minutes').add(1, 'minute').toISOString(), // Future slots only with timezone adjustment, // Ensure we're only getting future slots, excluding current time
                },
            },
        });

        const count = availableSlots.length;

        res.status(200).json({
            status: 200,
            count,
            splitAvailabilities: availableSlots
        })
    } catch (error) {
        console.log('Error occurred:', error);
        res.status(500).json({
            status: 500,
            msg: 'Something went wrong'
        });
    }
}

// mark as completed
export const isBookingCompleted = async (req, res) => {
    const bookingId = +req.params.bookingId
    try {
        const isBooking = await prisma.booking.findUnique({ where: { id: bookingId } })
        if (!(isBooking)) {
            return res.status(404).json({ status: 404, msg: 'No Booking found' })
        }
        const completed = await prisma.booking.update({ where: { id: bookingId }, data: { isCompleted: 'yes' } })
        res.status(200).json({ status: 200, msg: 'Session completed successfully' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

// get completed session till now











export const deleteAllAvailableSlots = async (req, res) => {
    try {

        await prisma.availableSlots.deleteMany();

        res.status(200).json({
            status: 200,
            message: 'All available slots have been deleted',
        });
    } catch (error) {
        console.error('Error deleting available slots:', error);
        res.status(500).json({
            status: 500,
            message: 'An error occurred while deleting available slots',
        });
    }
};


// update doctor profile
export const updateDoctorProfile = async (req, res) => {
    const doctorId = +req.params.doctorId
    const fileInfo = req.file
    const { contactNumber, maximumEducation } = req.body
    try {
        const updatedData = {}
        if (contactNumber) {
            updatedData.contactNumber = contactNumber
        }

        if (maximumEducation) {
            updatedData.maximumEducation = maximumEducation
        }

        if (fileInfo) {
            const fileType = fileInfo.mimetype
            const fileSizeMB = fileInfo.size / (1024 * 1024)
            const isImage = (fileType === 'image/jpeg' || fileType === 'image/png') && fileSizeMB <= 2
            if (!isImage) {
                return res.status(400).json({
                    status: 400,
                    msg: 'Profile Image must  be a JPG or PNG image and size must be less than 2MB',
                })
            }
            updatedData.profileUrl = fileInfo.path
        }

        if (Object.keys(updatedData).length === 0) {
            return res.status(400).json({ status: 400, msg: 'No fields to update' })
        }

        const update = await prisma.doctor.update({ where: { id: doctorId }, data: updatedData })
        res.status(200).json({ status: 200, msg: 'Profile is updated Succesfully' })

    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

// doctor dashboard stats
export const doctorDashboardStats = async (req, res) => {
    const doctorId = +req.params.doctorId
    try {
        // upcoming session
        const session = await prisma.booking.findMany({ where: { doctorId, isCompleted: 'no' } })
        const upcommingSessionCount = session.length
        // total services
        const service = await prisma.doctorService.findMany({ where: { doctorId } })
        const doctorServicesCount = service.length
        // meetings till now
        const meeting = await prisma.booking.findMany({ where: { doctorId, isCompleted: 'yes' } })
        const meetingsTillNowCount = meeting.length
        res.status(200).json({ status: 200, upcommingSessionCount, doctorServicesCount, meetingsTillNowCount })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })
    }
}

// doctor session history
export const doctorSessionHistory = async (req, res) => {
    const doctorId = +req.params.doctorId;
    try {
        const bookings = await prisma.booking.findMany({ where: { doctorId, isCompleted: 'yes' } });

        if (bookings.length === 0) {
            return res.status(404).json({ status: 404, msg: 'No bookings found for this doctor' });
        }

        const sessionHistories = await Promise.all(bookings.map(async (booking) => {
            const patient = await prisma.patient.findUnique({ where: { id: booking.patientId } });
            const service = await prisma.service.findUnique({ where: { id: booking.serviceId } });
            const rating = await prisma.rating.findUnique({
                where: { bookingId_patientId_doctorId: { bookingId: booking.id, patientId: booking.patientId, doctorId } }
            });

            return {
                patientName: patient?.patientName || "Unknown",
                patientImageUrl: patient?.profileUrl || null,
                patientGender: patient?.gender || "Unknown",
                serviceName: service.title,
                price: service?.price || null,
                stars: rating?.stars || null,
                review: rating?.review || null,
                dateAndTime: booking.slotStart
            }
        }))

        res.status(200).json({
            status: 200,
            sessionHistories
        });
    } catch (error) {
        console.log('Error fetching doctor session history:', error);
        res.status(500).json({ status: 500, msg: 'Something went wrong' });
    }
};


// get reviews from doctor id 
export const getReviewsFromDoctorId = async (req, res) => {
    const doctorId = +req.params.doctorId
    try {
        const reviews = await prisma.rating.findMany({
            where: { doctorId, isPublic: 'yes' },
            select: {
                stars: true,
                review: true,
                Patient: {
                    select: {
                        patientName: true,
                        profileUrl: true,
                        createdAt: true
                    }
                }
            }
        })

        if (reviews.length === 0) {
            return res.status(404).json({ status: 400, msg: 'No review found' })
        }

        res.status(200).json({ status: 200, reviews })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, msg: 'Something went wrong' })

    }
}