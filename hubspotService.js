require('dotenv').config();
const hubspot = require('@hubspot/api-client');

// Initialize the HubSpot client with your API key
const hubspotClient = new hubspot.Client({ accessToken: process.env.HUBSPOT_API_KEY });

/**
 * Creates or updates a contact in HubSpot
 * @param {Object} formData - The form data submitted by the user
 * @returns {Promise} - The result of the HubSpot API call
 */
async function createOrUpdateContact(formData) {
  try {
    // Format the date as YYYY-MM-DD (midnight UTC)
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // Gets YYYY-MM-DD format
    
    // Map role values to their full display names
    const roleMapping = {
      'architect': 'Architect',
      'interior-designer': 'Interior Designer',
      'home-builder': 'Home Builder',
      'developer': 'Real Estate Developer',
      '3d-artist': '3D Artist/Renderer',
      'other': formData.otherRole || 'Other'
    };
    
    // Get the formatted role from the mapping or use capitalized version as fallback
    let formattedRole = roleMapping[formData.role];
    
    // If no mapping exists, format it by capitalizing and removing hyphens
    if (!formattedRole && formData.role) {
      formattedRole = formData.role
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Define the contact properties
    const contactProperties = {
      email: formData.email,
      firstname: formData.name.split(' ')[0],
      lastname: formData.name.split(' ').slice(1).join(' '),
      company: formData.company,
      prism_role: formattedRole, // Add custom role property only
      prism_use_case: formData.useCase,
      prism_early_access_signup_date: formattedDate,
    };

    // Search for existing contact by email
    const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ',
          value: formData.email
        }]
      }]
    });

    if (searchResponse.results && searchResponse.results.length > 0) {
      // Contact exists, update it
      const contactId = searchResponse.results[0].id;
      console.log(`Updating existing contact with ID: ${contactId}`);
      
      await hubspotClient.crm.contacts.basicApi.update(contactId, {
        properties: contactProperties
      });
      
      return {
        success: true,
        message: `Contact updated in HubSpot: ${formData.email}`,
        contactId: contactId
      };
    } else {
      // Create new contact
      console.log(`Creating new contact in HubSpot: ${formData.email}`);
      
      const createResponse = await hubspotClient.crm.contacts.basicApi.create({
        properties: contactProperties
      });
      
      return {
        success: true,
        message: `Contact created in HubSpot: ${formData.email}`,
        contactId: createResponse.id
      };
    }
  } catch (error) {
    console.error('Error creating/updating contact in HubSpot:', error);
    return {
      success: false,
      message: 'Failed to create or update contact in HubSpot',
      error: error.message
    };
  }
}

/**
 * Adds contact to early access list in HubSpot
 * @param {String} contactId - The HubSpot contact ID
 * @returns {Promise} - The result of the HubSpot API call
 */
async function addContactToList(contactId, listId) {
  try {
    if (!listId) {
      return {
        success: false,
        message: 'No list ID provided'
      };
    }

    console.log(`Attempting to add contact ID ${contactId} to list ${listId}`);
    
    // Add contact to a static list - using the correct API format
    const response = await hubspotClient.apiRequest({
      method: 'POST',
      path: `/contacts/v1/lists/${listId}/add`,
      body: {
        vids: [contactId]
      }
    });

    return {
      success: true,
      message: `Contact added to list ${listId}`
    };
  } catch (error) {
    console.error('Error adding contact to HubSpot list:', error);
    return {
      success: false,
      message: 'Failed to add contact to HubSpot list',
      error: error.message
    };
  }
}

module.exports = {
  createOrUpdateContact,
  addContactToList
}; 