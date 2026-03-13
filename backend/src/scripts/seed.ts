import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Message } from "../models/Message.js";
import { MessageGroup } from "../models/MessageGroup.js";
import { MessageGroupMember } from "../models/MessageGroupMember.js";
import { MessageRead } from "../models/MessageRead.js";
import { MessageDeletion } from "../models/MessageDeletion.js";

dotenv.config();

const USERS_TO_ADD = [
  { first_name: "Ali", last_name: "Khan", email: "ali@workchat.com", password: "Ali@123" },
  { first_name: "Sara", last_name: "Ahmed", email: "sara@workchat.com", password: "Sara@123" },
  { first_name: "Omar", last_name: "Hassan", email: "omar@workchat.com", password: "Omar@123" },

  { first_name: "Usman", last_name: "Ali", email: "usman@workchat.com", password: "Usman@123" },
  { first_name: "Ayesha", last_name: "Malik", email: "ayesha@workchat.com", password: "Ayesha@123" },
  { first_name: "Bilal", last_name: "Sheikh", email: "bilal@workchat.com", password: "Bilal@123" },
  { first_name: "Hina", last_name: "Raza", email: "hina@workchat.com", password: "Hina@123" },
  { first_name: "Farhan", last_name: "Iqbal", email: "farhan@workchat.com", password: "Farhan@123" },
  { first_name: "Zain", last_name: "Malik", email: "zain@workchat.com", password: "Zain@123" },
  { first_name: "Fatima", last_name: "Noor", email: "fatima@workchat.com", password: "Fatima@123" },
  { first_name: "Hamza", last_name: "Qureshi", email: "hamza@workchat.com", password: "Hamza@123" },
  { first_name: "Maryam", last_name: "Tariq", email: "maryam@workchat.com", password: "Maryam@123" },
  { first_name: "Danish", last_name: "Aslam", email: "danish@workchat.com", password: "Danish@123" },
  { first_name: "Kashif", last_name: "Mehmood", email: "kashif@workchat.com", password: "Kashif@123" },
  { first_name: "Nida", last_name: "Yousaf", email: "nida@workchat.com", password: "Nida@123" },
  { first_name: "Adnan", last_name: "Shah", email: "adnan@workchat.com", password: "Adnan@123" },
  { first_name: "Sadia", last_name: "Akram", email: "sadia@workchat.com", password: "Sadia@123" },
  { first_name: "Imran", last_name: "Latif", email: "imran@workchat.com", password: "Imran@123" },
  { first_name: "Rabia", last_name: "Saleem", email: "rabia@workchat.com", password: "Rabia@123" },
  { first_name: "Yasir", last_name: "Nawaz", email: "yasir@workchat.com", password: "Yasir@123" }
];
async function seed(): Promise<void> {
  await connectDB();

  console.log("Clearing existing users...");
  await User.deleteMany({});

  console.log("Clearing messages, groups, and related data...");
  await MessageDeletion.deleteMany({});
  await MessageRead.deleteMany({});
  await Message.deleteMany({});
  await MessageGroupMember.deleteMany({});
  await MessageGroup.deleteMany({});

  console.log("Adding 3 users (password hashed with bcrypt)...");
  for (const u of USERS_TO_ADD) {
    const hash = await bcrypt.hash(u.password, 10);
    await User.create({
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      password: hash,
      about: "Hey there! I am using WorkChat.",
      status: "active",
      chat_status: "offline",
      is_online: 0,
    });
  }

  console.log("\n✅ Seed done. Use these to login (Email + Password):\n");
  USERS_TO_ADD.forEach((u, i) => {
    console.log(`  User ${i + 1}: ${u.email}  /  ${u.password}  (${u.first_name} ${u.last_name})`);
  });
  console.log("\n");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
