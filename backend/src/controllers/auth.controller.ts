import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import prisma from '../config/prismaClient.js';

// =============================================================================
// Constants
// =============================================================================
const SALT_ROUNDS = 12; // bcrypt work factor — 12 is the production sweet spot
                        // (slow enough to resist brute-force, fast enough for UX)

/**
 * Registers a new user and provisions their role-specific profile.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const {
    email,
    password,
    role,
    adminSecret,
    // Student-specific fields sent from Auth.tsx registration form
    firstName,
    lastName,
    college,
    cgpa,
    // Recruiter-specific fields
    companyName,
    designation,
  } = req.body as {
    email?: string;
    password?: string;
    role?: string;
    adminSecret?: string;
    firstName?: string;
    lastName?: string;
    college?: string;
    cgpa?: number;
    companyName?: string;
    designation?: string;
  };

  if (!email || !password || !role) {
    res.status(400).json({ success: false, message: 'email, password, and role are required.' });
    return;
  }

  const allowedRoles: Role[] = ['STUDENT', 'RECRUITER', 'ADMIN'];
  if (!allowedRoles.includes(role as Role)) {
    res.status(400).json({ success: false, message: `role must be one of: ${allowedRoles.join(', ')}.` });
    return;
  }

  if (role === 'ADMIN') {
    if (!adminSecret || adminSecret !== process.env['ADMIN_SECRET']) {
      res.status(403).json({ success: false, message: 'Forbidden: Invalid Admin Secret.' });
      return;
    }
  }

  try {
    const cleanEmail = email.trim();
    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: 'insensitive',
        },
      },
    });
    
    if (existingUser) {
      res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        role: role as Role,
      },
    });

    try {
      if (role === 'STUDENT') {
        const parsedCgpa = parseFloat(String(cgpa ?? ''));
        const safeCgpa   = (!isNaN(parsedCgpa) && parsedCgpa >= 0 && parsedCgpa <= 10)
          ? parsedCgpa
          : 0;

        await prisma.studentProfile.create({
          data: {
            userId:          user.id,
            firstName:       typeof firstName === 'string' ? firstName.trim() : '',
            lastName:        typeof lastName  === 'string' ? lastName.trim()  : '',
            college:         typeof college   === 'string' ? college.trim()   : '',
            parsedSkills:    [],
            cgpa:            safeCgpa,
            experienceYears: 0,
          },
        });
      } else if (role === 'RECRUITER') {
        await prisma.recruiterProfile.create({
          data: {
            userId:      user.id,
            companyName: typeof companyName === 'string' ? companyName.trim() : '',
            designation: typeof designation  === 'string' ? designation.trim()  : '',
          },
        });
      }
    } catch (profileError) {
      await prisma.user.delete({ where: { id: user.id } });
      // Log the full Prisma error for debugging in Render logs
      console.error('[register] Profile creation failed — user rolled back:', profileError);
      res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please complete your profile.',
      data: { userId: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    // Log the full error (including Prisma connection errors) so they appear in Render logs
    console.error('[register] Unexpected error:', error);
    res.status(500).json({ success: false, message: 'An unexpected error occurred during registration.' });
  }
};

/**
 * Authenticates a user and issues a stateless JSON Web Token.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'email and password are required.' });
    return;
  }

  try {
    const cleanEmail = email.trim();
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: 'insensitive',
        },
      },
    });

    const dummyHash = '$2a$12$invalidhashfortimingnormalization0000000000000000000000';
    const isPasswordValid = await bcrypt.compare(
      password,
      user?.passwordHash ?? dummyHash,
    );

    if (!user || !isPasswordValid) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      console.error('[login] FATAL: JWT_SECRET is not set in environment variables.');
      res.status(500).json({ success: false, message: 'Internal server error.' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      secret,
      { expiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d' } as jwt.SignOptions,
    );

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: { userId: user.id, email: user.email, role: user.role },
      },
    });
  } catch (error) {
    // Log the full error (including Prisma/MongoDB connection errors) so they appear in Render logs
    console.error('[login] Unexpected error:', error);
    res.status(500).json({ success: false, message: 'An unexpected error occurred during login.' });
  }
};
