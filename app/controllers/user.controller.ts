import {Request, Response} from 'express';
import {
  GetUsersResponse, GetUserResponse,
  UserUpdateBody, PutUpdatedUserResponse
} from '../interfaces/user.interfaces';
import {UserRole} from '../entities/user';
import {GenericResponse} from '../interfaces/general.interfaces';


export async function getUsers(req: Request, res: Response) {
  // TODO: Implement properly

  // Users can be filtered by role
  const roleFilter: UserRole | undefined = req.query.role;
  if (roleFilter === UserRole.UNVERIFIED) {
    res.status(200).json({
      data: [{
        id: '125',
        email: 'tester3@example.com',
        name: 'Tester 3',
        role: UserRole.UNVERIFIED
      }]
    });
    return;
  }
  const json: GetUsersResponse = {
    data: [{
      id: '123',
      email: 'tester@example.com',
      name: 'Tester',
      role: UserRole.ADMIN
    }, {
      id: '124',
      email: 'tester2@example.com',
      name: 'Tester 2',
      role: UserRole.VERIFIED
    }, {
      id: '125',
      email: 'tester3@example.com',
      name: 'Tester 3',
      role: UserRole.UNVERIFIED
    }, {
      id: '126',
      email: 'tester4@example.com',
      name: 'Tester 4',
      role: UserRole.SLACK
    }]
  };
  res.status(200).json(json);
}

export async function getUser(req: Request, res: Response) {
  // TODO: Implement
  const userId = req.params.userId;
  const json: GetUserResponse = {
    data: {
      id: '123',
      email: 'tester@example.com',
      name: 'Tester',
      role: UserRole.ADMIN
    }
  };
  res.status(200).json(json);
}

export async function putUpdatedUser(req: Request, res: Response) {
  // TODO: Implement
  const userId = req.params.userId;
  const data: UserUpdateBody = req.body;
  const json: PutUpdatedUserResponse = {
    message: 'User successfully updated',
    data: {
      id: userId,
      ...data
    }
  };
  res.status(200).json(json);
}


export async function deleteUser(req: Request, res: Response) {
  // TODO: Implement
  const userId = req.params.userId;
  const json: GenericResponse = {
    message: 'User successfully deleted'
  };
  res.status(200).json(json);
}
