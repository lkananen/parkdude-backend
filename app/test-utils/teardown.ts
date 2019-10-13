import {getConnection} from 'typeorm';

export async function closeConnection() {
  await getConnection().close();
  // Small timeout to prevent jest's open handle error
  await new Promise((resolve) => setTimeout(resolve, 500));
}
