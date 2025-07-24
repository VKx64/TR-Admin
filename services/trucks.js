import pb from "./pocketbase";

export async function getTruckById(truckId) {
  try {
    // Fetch truck with expanded users_id relation to get driver information
    const truck = await pb.collection("trucks").getOne(truckId, {
      expand: "users_id",
      requestKey: null
    });
    return truck;
  } catch (error) {
    console.error("Error fetching truck:", error);
    throw error;
  }
}

export async function updateTruck(truckId, truckData, imageFile = null) {
  try {
    const formData = new FormData();

    // Add all truck data fields to formData
    Object.keys(truckData).forEach(key => {
      // Skip id and system fields
      if (key !== 'id' && !['created', 'updated', 'collectionId', 'collectionName'].includes(key)) {
        if (key === 'truck_date' && truckData[key]) {
          // Format date properly if present
          formData.append(key, truckData[key]);
        } else if (truckData[key] !== null && truckData[key] !== undefined) {
          formData.append(key, truckData[key]);
        }
      }
    });

    // Handle the image file if provided
    if (imageFile && imageFile instanceof File) {
      formData.append('truck_image', imageFile);
    } else if (imageFile === null) {
      // If explicitly set to null, clear the image
      formData.append('truck_image-', ''); // This is PocketBase's way to clear a file field
    }

    // Update the record
    const updatedTruck = await pb.collection("trucks").update(truckId, formData, {
      requestKey: null
    });
    return updatedTruck;
  } catch (error) {
    console.error("Error updating truck:", error);
    throw error;
  }
}

export async function deleteTruck(truck_id) {
  try {
    const result = await pb.collection("trucks").delete(truck_id, {
      requestKey: null
    });
    console.log(result)
    return true;
  } catch (error) {
    console.log(error);
    return false
  }
}

export async function archiveTruck(truckId) {
  try {
    await pb.collection("trucks").update(truckId, {
      is_archive: true
    }, {
      requestKey: null
    });
    return true;
  } catch (error) {
    console.error("Error archiving truck:", error);
    return false;
  }
}

export async function unarchiveTruck(truckId) {
  try {
    await pb.collection("trucks").update(truckId, {
      is_archive: false
    }, {
      requestKey: null
    });
    return true;
  } catch (error) {
    console.error("Error unarchiving truck:", error);
    return false;
  }
}