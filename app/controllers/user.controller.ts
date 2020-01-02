import {Request, Response} from 'express';
import {
  GetUsersResponse, GetUserResponse,
  UserUpdateBody, PutUpdatedUserResponse
} from '../interfaces/user.interfaces';
import {UserRole} from '../entities/user';
import {GenericResponse} from '../interfaces/general.interfaces';
import {
  fetchUsers, fetchUser, updateUser, deleteUser,
  clearSessions, getUserSession, getUsersSessions
} from '../services/user.service';

export async function getUsers(req: Request, res: Response) {
  const roleFilter: UserRole | undefined = req.query.role;
  const users = await fetchUsers(roleFilter);
  const usersSessions = await getUsersSessions(users);
  const json: GetUsersResponse = {
    data: await Promise.all(usersSessions.map(async (user) => {
      return {...await user.toFullUserData(), sessions: user.sessions};
    }))
  };
  res.status(200).json(json);
}

export async function getUser(req: Request, res: Response) {
  const userId = req.params.userId;
  const user = await fetchUser(userId);
  const userSessions = await getUserSession(user);
  const json: GetUserResponse = {
    data: {...await user.toFullUserData(), sessions: userSessions.sessions}
  };
  res.status(200).json(json);
}

export async function putUpdatedUser(req: Request, res: Response) {
  const userId = req.params.userId;
  const user = await fetchUser(userId);
  let data: UserUpdateBody = req.body;
  data = await updateUser(user, data);
  const json: PutUpdatedUserResponse = {
    message: 'User successfully updated',
    data: {
      id: userId,
      ...data
    }
  };
  res.status(200).json(json);
}

export async function deleteDeleteUser(req: Request, res: Response) {
  const userId = req.params.userId;
  // May not want to allow deleting self
  const user = await fetchUser(userId);
  await deleteUser(user);
  const json: GenericResponse = {
    message: 'User successfully deleted'
  };
  res.status(200).json(json);
}

export async function postClearSessions(req: Request, res: Response) {
  const userId = req.params.userId;
  const user = await fetchUser(userId);
  const userSessions = await getUserSession(user);
  await clearSessions(userSessions);

  const json: GenericResponse = {
    message: 'User\'s session cleared'
  };
  res.status(200).json(json);
}
