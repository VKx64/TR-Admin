import PocketBase from "pocketbase";

const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);

// Login Function store user credentials in AuthStore
export async function login(email, password) {
  try {
    // Authenticate User with Email and Password
    const authData = await pb
      .collection("users")
      .authWithPassword(email, password);

    // Check if the authenticated user has the 'admin' role
    if (authData.record && authData.record.role === "admin") {
      console.log("Admin Login Successful!");
      console.log("User ID: ", pb.authStore.record.id);
      return true;
    } else {
      console.log("Login Failed: User is not an admin.");
      pb.authStore.clear();
      return false;
    }
  } catch (error) {
    console.error("Login Failed: ", error);
    pb.authStore.clear();
    return false;
  }
}

// Logout Function
export function logout() {
  pb.authStore.clear();
  console.log("User Logged Out Successfully");
  return true;
}
