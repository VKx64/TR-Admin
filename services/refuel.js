import pb from "./pocketbase";

export async function getRefuelById(refuelId) {
  try {
    // Fetch refuel with expanded truck_id relation to get truck information
    const refuel = await pb.collection("truck_fuel").getOne(refuelId, {
      expand: "truck_id",
    });
    return refuel;
  } catch (error) {
    console.error("Error fetching refuel:", error);
    throw error;
  }
}

export async function updateRefuel(refuelId, refuelData, receiptFile = null) {
  try {
    const formData = new FormData();

    // Add all refuel data fields to formData
    Object.keys(refuelData).forEach(key => {
      // Skip id and system fields
      if (key !== 'id' && !['created', 'updated', 'collectionId', 'collectionName'].includes(key)) {
        if (refuelData[key] !== null && refuelData[key] !== undefined) {
          formData.append(key, refuelData[key]);
        }
      }
    });

    // Handle the receipt file if provided
    if (receiptFile && receiptFile instanceof File) {
      formData.append('reciept', receiptFile);
    } else if (receiptFile === null) {
      // If explicitly set to null, clear the image
      formData.append('reciept-', ''); // This is PocketBase's way to clear a file field
    }

    // Update the record
    const updatedRefuel = await pb.collection("truck_fuel").update(refuelId, formData);
    return updatedRefuel;
  } catch (error) {
    console.error("Error updating refuel:", error);
    throw error;
  }
}

export async function deleteRefuel(refuelId) {
  try {
    const result = await pb.collection("truck_fuel").delete(refuelId);
    console.log(result)
    return true;
  } catch (error) {
    console.log(error);
    return false
  }
}