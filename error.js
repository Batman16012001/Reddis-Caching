//error.js
module.exports = {
    InvalidDataFormat: {
        statusCode: 400,
        errorCode: 'InvalidDataFormat',
        message: "Invalid Input",
        details: "Ensure the provided input matches the required format."
    },
    MissingRequiredFields: {
        statusCode: 400,
        errorCode: 'MissingRequiredFields',
        message: 'The following required fields are missing: [list of missing fields].',
        details: 'Ensure all required fields are provided in the request.'
    },
    InternalServerError: {
        statusCode: 500,
        errorCode: "InternalServerError",
        message: "An internal server error occurred.",
        details: "Please try again later or contact support if the issue persists.",
    },
    DatabaseError: {
        statusCode: 500,
        errorCode: 'DatabaseError',
        message: 'An error occurred while processing your request. Please try again later.',
        details: 'There was an unexpected error while processing your request due to a database issue. Please try again later. If the problem persists, contact support for assistance.'
    },
    CampaignIdNotFound: {
        statusCode: 404,
        errorCode: 'CampaignIdNotFound',
        message: 'CampaignId with ID {campaign_id} not found.',
        details: 'Ensure the CampaignId is correct and exists in the system.'
    },
    UserIdNotFound: {
        statusCode: 404,
        errorCode: 'UserIdNotFound',
        message: 'UserId with ID {user_id} not found.',
        details: 'Ensure the userId is correct and exists in the system.'
    },
    NoCampaignsFound: {
        statusCode: 404,
        errorCode: 'NoCampaignsFound',
        message: 'No leads found for user {user_id}',
        details: 'No leads assigned to this user.'
    },
    InvalidSummaryType: {
        statusCode: 404,
        errorCode: 'InvalidSummaryType',
        message: 'No leads found for given summary type.',
        details: 'No leads assigned to this summary type.'
    },
    NoLeadsFound: {
        statusCode: 404,
        errorCode: 'NoLeadsFound',
        message: 'No leads found for ID {campaign_id}',
        details: 'No leads assigned to this user.'
    },
};
