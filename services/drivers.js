import pb from "./pocketbase";

export async function getDriverById(driverId) {
  try {
    // Fetch user with expanded driver_details_id relation to get driver information
    const driver = await pb.collection("users").getOne(driverId, {
      expand: "driver_details_id",
      requestKey: null
    });
    return driver;
  } catch (error) {
    console.error("Error fetching driver:", error);
    throw error;
  }
}

export async function updateDriver(driverId, userData, driverDetailsData = {}, licenseImage = null, avatarImage = null) {
  try {
    // Update the user information first
    const userFormData = new FormData();

    // Add relevant user fields
    if (userData.username) userFormData.append('username', userData.username);
    if (userData.email) userFormData.append('email', userData.email);
    if (userData.role) userFormData.append('role', userData.role);

    // Handle avatar image if provided
    if (avatarImage && avatarImage instanceof File) {
      userFormData.append('avatar', avatarImage);
    } else if (avatarImage === null) {
      // If explicitly set to null, clear the image
      userFormData.append('avatar-', ''); // PocketBase's way to clear a file field
    }

    // Update the user record
    await pb.collection("users").update(driverId, userFormData, {
      requestKey: null
    });

    // Get the current user to check if they have driver details
    const currentDriver = await pb.collection("users").getOne(driverId, {
      requestKey: null
    });
    let driverDetailsId = currentDriver.driver_details_id;

    // Create driver details form data
    const detailsFormData = new FormData();

    // Add driver details fields
    Object.keys(driverDetailsData).forEach(key => {
      if (driverDetailsData[key] !== null && driverDetailsData[key] !== undefined) {
        detailsFormData.append(key, driverDetailsData[key]);
      }
    });

    // Handle the license image if provided
    if (licenseImage && licenseImage instanceof File) {
      detailsFormData.append('driver_license_picture', licenseImage);
    } else if (licenseImage === null) {
      // If explicitly set to null, clear the image
      detailsFormData.append('driver_license_picture-', ''); // PocketBase's way to clear a file field
    }

    // If driver details exist, update them; otherwise create new driver details
    if (driverDetailsId) {
      // Update existing driver details
      await pb.collection("driver_details").update(driverDetailsId, detailsFormData, {
        requestKey: null
      });
    } else {
      // Create new driver details and link to user
      const newDriverDetails = await pb.collection("driver_details").create(detailsFormData, {
        requestKey: null
      });

      // Update user with new driver_details_id
      await pb.collection("users").update(driverId, {
        driver_details_id: newDriverDetails.id
      }, {
        requestKey: null
      });
    }

    return true;
  } catch (error) {
    console.error("Error updating driver:", error);
    throw error;
  }
}

export async function archiveDriver(driverId) {
  try {
    // Get the driver to find related driver_details
    const driver = await pb.collection("users").getOne(driverId, {
      requestKey: null
    });

    // If there are driver details, archive them by setting is_archived to true
    if (driver.driver_details_id) {
      await pb.collection("driver_details").update(driver.driver_details_id, {
        is_archived: true
      }, {
        requestKey: null
      });
    }

    return true;
  } catch (error) {
    console.error("Error archiving driver:", error);
    return false;
  }
}

export async function unarchiveDriver(driverId) {
  try {
    // Get the driver to find related driver_details
    const driver = await pb.collection("users").getOne(driverId, {
      requestKey: null
    });

    // If there are driver details, unarchive them by setting is_archived to false
    if (driver.driver_details_id) {
      await pb.collection("driver_details").update(driver.driver_details_id, {
        is_archived: false
      }, {
        requestKey: null
      });
    }

    return true;
  } catch (error) {
    console.error("Error unarchiving driver:", error);
    return false;
  }
}