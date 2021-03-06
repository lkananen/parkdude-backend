import {Request, Response} from 'express';
import {
  GetUsersResponse, GetUserResponse,
  UserUpdateBody, PutUpdatedUserResponse
} from '../interfaces/user.interfaces';
import {UserRole, User} from '../entities/user';
import {GenericResponse} from '../interfaces/general.interfaces';
import {CreateUserBody, PostUserResponse, PutUserPasswordBody} from '../interfaces/user.interfaces';
import {BadRequestError, ForbiddenError} from '../utils/errors';
import {
  fetchUsers, fetchUser, updateUser, deleteUser,
  clearSessions, getUserSessions, getUsersSessions,
  createPasswordVerifiedUser, changePassword, getPassword, passwordsMatch,
  initialiseAdmin
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
  const userSessions = await getUserSessions(user);
  const json: GetUserResponse = {
    data: {...await user.toFullUserData(), sessions: userSessions.sessions}
  };
  res.status(200).json(json);
}

export async function postUser(req: Request, res: Response) {
  const body: CreateUserBody = req.body;
  const user = await createPasswordVerifiedUser(body);
  if ((req.user as User)?.role === UserRole.ADMIN) {
    const data = user.toUserData();
    data.role = UserRole.VERIFIED;
    await updateUser(user, data);
  }
  const json: PostUserResponse = {
    message: 'User created successfully',
    data: user.toUserData()
  };
  res.status(200).json(json);
}

export async function putUpdatedUser(req: Request, res: Response) {
  const userId = req.params.userId;
  const user = await fetchUser(userId);
  const data: UserUpdateBody = req.body;
  const updatedUser = await updateUser(user, data);
  const json: PutUpdatedUserResponse = {
    message: 'User successfully updated',
    data: updatedUser.toUserData()
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


export async function putMyUserPassword(req: Request, res: Response) {
  const body: PutUserPasswordBody = req.body;
  const user = req.user as User;
  if (!body.oldPassword) {
    throw new BadRequestError('Old password is required.');
  }
  if (!user.hasPassword) {
    throw new ForbiddenError('Account created with Google login. Passwords are disabled.');
  }
  const oldPasswordHash = await getPassword(user);
  if (!await passwordsMatch(body.oldPassword, oldPasswordHash!!)) {
    throw new BadRequestError('Old password is wrong. Try again.');
  }

  await putUserPassword(req, res);
}

export async function putUserPassword(req: Request, res: Response) {
  const user = req.params.userId ? await fetchUser(req.params.userId) : req.user as User;
  const body: PutUserPasswordBody = req.body;
  const password = body.password;
  await changePassword(user, password);
  const json: GenericResponse = {
    message: 'Password successfully updated.'
  };
  res.status(200).json(json);
}

export async function postClearSessions(req: Request, res: Response) {
  const userId = req.params.userId;
  const user = await fetchUser(userId);
  const userSessions = await getUserSessions(user);
  await clearSessions(userSessions);

  const json: GenericResponse = {
    message: 'User\'s session cleared'
  };
  res.status(200).json(json);
}

/**
 * Creates new admin based on env variables if database does not have any
 * admins. Is used when database is just created and there aren't yet anyone
 * with permissions to create admins.
 * Note: This uses GET to make initialisation easier via browser.
 * It also is used only once and can't be used again, so it should be okay.
 */
export async function getInitialiseAdmin(req: Request, res: Response) {
  await initialiseAdmin();
  res.json({
    message: 'Root admin initialised successfully. ' +
    'Use this admin to create your first admin user, and delete this user after that.'
  });
}
