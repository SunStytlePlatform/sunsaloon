import { logger } from '../utils/logger.js';
import { sendSuccess } from '../utils/response.js';
import * as appointmentService from '../services/appointment.service.js';

export async function createAppointment(req, res, next) {
  try {
    logger.debug(`[${req.id}] entered appointment.controller.createAppointment`);
    const appointment = await appointmentService.createAppointment(req.validated.body);
    sendSuccess(res, { status: 201, message: 'Appointment request submitted successfully', data: appointment });
  } catch (err) {
    logger.debug(`[${req.id}] appointment.controller.createAppointment failed: ${err.message}`);
    next(err);
  }
}

export async function listAppointments(req, res, next) {
  try {
    logger.debug(`[${req.id}] entered appointment.controller.listAppointments`);
    const appointments = await appointmentService.listAppointments(req.validated.query);
    sendSuccess(res, { message: 'Appointments retrieved successfully', data: appointments });
  } catch (err) {
    logger.debug(`[${req.id}] appointment.controller.listAppointments failed: ${err.message}`);
    next(err);
  }
}

export async function updateAppointmentStatus(req, res, next) {
  try {
    logger.debug(`[${req.id}] entered appointment.controller.updateAppointmentStatus`);
    const appointment = await appointmentService.updateAppointmentStatus(
      req.validated.params.id,
      req.validated.body.status,
    );
    sendSuccess(res, { message: 'Appointment status updated successfully', data: appointment });
  } catch (err) {
    logger.debug(`[${req.id}] appointment.controller.updateAppointmentStatus failed: ${err.message}`);
    next(err);
  }
}
