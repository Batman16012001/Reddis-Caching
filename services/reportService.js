const { promisePool } = require('../config/mysqlDB');
const logger = require("../utils/logger");

const getReportDataService = async (filterData) => {
    const {
        summary_by, start_date, end_date,
        campaign_name, group_name, branch_name, unit_name
    } = filterData;

    logger.info(
        `[getReportDataService] Request received with query: ${JSON.stringify(
            filterData
        )}`
    );
    try {
        const summaryType = summary_by.toLowerCase();
        let viewBy = '';
        let whereClause = '';
        let groupBy = '';
        let orderBy = '';
        let filterArray = [];

        const summaryConfigs = {
            campaign_type: {
                viewBy: 'l.lead_source AS Campaign_Type',
                where: 'c.creation_date BETWEEN ? AND ?',
                group: 'l.lead_source',
                order: 'l.lead_source',
                filters: [start_date, end_date]
            },
            campaign_name: {
                viewBy: 'c.campaign_name AS Campaign_Name',
                where: 'c.creation_date BETWEEN ? AND ?',
                group: 'c.campaign_name',
                order: 'c.campaign_name',
                filters: [start_date, end_date]
            },
            group: {
                viewBy: 'l.group_code AS Group_Code',
                where: `
                    c.creation_date BETWEEN ? AND ? AND 
                    (? = 'All' OR l.campaign_id = ?) AND 
                    (? = 'All' OR l.group_code = ?)
                `,
                group: 'l.group_code',
                order: 'l.group_code',
                filters: [start_date, end_date, campaign_name, campaign_name, group_name, group_name]
            },
            branch: {
                viewBy: 'l.group_code AS Group_Code, l.branch_code AS Branch_Code',
                where: `
                    c.creation_date BETWEEN ? AND ? AND 
                    (? = 'All' OR l.campaign_id = ?) AND 
                    (? = 'All' OR l.group_code = ?) AND 
                    (? = 'All' OR l.branch_code = ?)
                `,
                group: 'l.group_code, l.branch_code',
                order: 'l.group_code',
                filters: [start_date, end_date, campaign_name, campaign_name, group_name, group_name, branch_name, branch_name]
            },
            unit: {
                viewBy: 'l.group_code AS Group_Code, l.branch_code AS Branch_Code, l.unit_code AS Unit_Code',
                where: `
                    c.creation_date BETWEEN ? AND ? AND 
                    (? = 'All' OR l.campaign_id = ?) AND 
                    (? = 'All' OR l.group_code = ?) AND 
                    (? = 'All' OR l.branch_code = ?) AND 
                    (? = 'All' OR l.unit_code = ?)
                `,
                group: 'l.group_code, l.branch_code, l.unit_code',
                order: 'l.group_code',
                filters: [start_date, end_date, campaign_name, campaign_name, group_name, group_name, branch_name, branch_name, unit_name, unit_name]
            },
            lia: {
                viewBy: `l.group_code AS Group_Code, l.branch_code AS Branch_Code, l.unit_code AS Unit_Code, COALESCE(l.so_code, 'Unknown') AS SO_Code`,
                where: `
                    c.creation_date BETWEEN ? AND ? AND 
                    (? = 'All' OR l.campaign_id = ?) AND 
                    (? = 'All' OR l.group_code = ?) AND 
                    (? = 'All' OR l.branch_code = ?) AND 
                    (? = 'All' OR l.unit_code = ?)
                `,
                group: 'l.group_code, l.branch_code, l.unit_code, l.so_code',
                order: 'l.group_code',
                filters: [start_date, end_date, campaign_name, campaign_name, group_name, group_name, branch_name, branch_name, unit_name, unit_name]
            }
        };

        const config = summaryConfigs[summaryType];
        if (!config) {
            logger.warn(
                `[getReportDataService] Summary Type Validation errors: ${JSON.stringify(config)}`
            );
            return 'InvalidSummaryType';
        }

        ({ viewBy, where: whereClause, group: groupBy, order: orderBy, filters: filterArray } = config);

        // Append user filter if user_id is provided
        if (filterData.user_id && filterData.user_id.trim() !== '') {
            whereClause += ' AND c.created_by = ?';
            filterArray.push(filterData.user_id);
        }

        const query = `
            SELECT
                ${viewBy},
                COUNT(l.lead_id) AS Total_Leads,
                SUM(CASE WHEN l.current_stage = 'Lead Assigned' THEN 1 ELSE 0 END) AS Total_Leads_Assigned,
                SUM(CASE WHEN l.current_stage IN (
                'Approached', 'Appointment Scheduled', 'FNA', 'Quotation', 
                'Incomplete Proposal', 'Pending Submission', 'Goal Analysis'
                ) THEN 1 ELSE 0 END) AS Total_Approached_Leads,
                SUM(CASE WHEN l.current_stage = 'Proposal' THEN 1 ELSE 0 END) AS Total_Converted_Leads,
                SUM(CASE WHEN l.current_stage IN ('Unsuccessful', 'Lead Lost', 'Lead Unqualified') THEN 1 ELSE 0 END) AS Total_Unsuccessful_Leads
            FROM LeadDetails l
            JOIN CampaignDetails c ON l.campaign_id = c.campaign_id
            WHERE ${whereClause}
            GROUP BY ${groupBy}
            ORDER BY ${orderBy}
        `;

        
        logger.info(
            `[getReportDataService] Executing query: ${JSON.stringify(
                query.replace(/\n/g, ' ')
            )}`
        );
        logger.info(
            `[getReportDataService] Executing query Filter: ${JSON.stringify(
                filterArray
            )}`
        );
        const [rows] = await promisePool.execute(query, filterArray);

        if (rows.length === 0) {
            
            logger.warn(
                `[getReportDataService] No leads found: ${""}`
            );
            return `NoLeadsFound: `;
        }

        return {
            data: { reportData: rows }
        };

    } catch (error) {
        
        logger.error(`[getReportDataService] Internal error: ${JSON.stringify(error)}`);
        if (error.code?.startsWith('ER_')) {
            logger.error(`[getReportDataService] Database error : ${JSON.stringify(error.code)}`);
            return 'DatabaseError';
        }

        return 'InternalServerError';
    } finally {
        promisePool.releaseConnection();
    }
};


const getCampaignListService = async (filterData) => {
    const { start_date, end_date, status, user_id, campaign_name } = filterData;
    logger.info(
        `[getCampaignListService] called with: ${JSON.stringify(
            filterData
        )}`
    );
    try {
        let query = `
            SELECT DISTINCT campaign_name, campaign_id 
            FROM CampaignDetails 
            WHERE creation_date BETWEEN ? AND ? 
              AND (? = 'All' OR status = ?)
        `;
        const params = [start_date, end_date, status, status];
      
        const userId = user_id?.trim();
        if (userId) {
            query += ` AND created_by = ?`;
            params.push(userId);
        }
        logger.info(
            `[getCampaignListService] Executing query: ${JSON.stringify(
                query.replace(/\n/g, ' ')
            )}`
        );
        const [rows] = await promisePool.execute(query, params);

        if (!rows.length) {
            logger.warn(
                `[getCampaignListService] No campaign found: ${""}`
            );
            return { data: { CampaignList: [] }, message: `No campaigns found.` };
        }

        return {
            data: { CampaignList: rows }
        };

    } catch (error) {
        
        logger.error(`[getCampaignListService] Internal Server error: ${JSON.stringify(error)}`);
        if (error.code?.startsWith('ER_')) {
            logger.error(`[getCampaignListService] Database error : ${JSON.stringify(error.code)}`);
            return 'DatabaseError';
        }

        return 'InternalServerError';
    } finally {
        promisePool.releaseConnection();
    }
};


const getGroupListService = async (filterData) => {

    try {
        logger.info(
            `[getGroupListService] called with: ${JSON.stringify(
                filterData
            )}`
        );
        let query;
        let filter = [];

        query = `SELECT DISTINCT group_code 
                 FROM LeadDetails 
                 WHERE group_code IS NOT NULL`;


        logger.info(
            `[getGroupListService] Executing query: ${JSON.stringify(
                query.replace(/\n/g, ' ')
            )}`
        );
        const [rows] = await promisePool.execute(query, filter);

        if (rows.length === 0) {
           
            logger.warn(
                `[getGroupListService] No groups found: ${""}`
            );
            return `NoGroupsFound: ${filterData.user_id || "N/A"}`;
        }

        const groups = rows.map((row, index) => ({
            id: index + 1,
            name: row.group_code,
        }));

        // Adding the "All" option at the end
        groups.push({ id: groups.length + 1, name: "All" });

        return {
            data: { GroupList: groups },
        };
    } catch (error) {
        
        logger.error(`[getGroupListService] Internal Server error: ${JSON.stringify(error)}`);
        if (error.code && error.code.startsWith("ER_")) {
            logger.error(`[getGroupListService] Database error : ${JSON.stringify(error.code)}`);
            return "DatabaseError";
        }       
        return "InternalServerError";
    } finally {
        promisePool.releaseConnection();
    }
};

const getBranchListService = async (filterData) => {


    try {

        logger.info(
            `[getBranchListService] called with: ${JSON.stringify(
                filterData
            )}`
        );
        let query;
        let filter;

        query = `SELECT DISTINCT branch_code 
        FROM LeadDetails 
        WHERE group_code = ?`;
        filter = [filterData.group_code];


        
        logger.info(
            `[getBranchListService] Executing query: ${JSON.stringify(
                query.replace(/\n/g, ' ')
            )}`
        );
        logger.info(
            `[getBranchListService] Executing query Filter: ${JSON.stringify(
                filter
            )}`
        );
        // Execute the query
        const [rows] = await promisePool.execute(query, filter);

        if (rows.length === 0) {
            logger.warn(
                `[getBranchListService] No branches found : ${""}`
            );
            return `NoCampaignsFound: ${filterData.branch_code}`;
        }

        const groups = rows.map((row, index) => ({
            id: index + 1,
            name: row.branch_code,
        }));

        // Adding the "All" option at the end
        groups.push({ id: groups.length + 1, name: "All" });

        
        return {
            data: { BranchList: groups },
        };
    } catch (error) {
        logger.error(`[getBranchListService] Internal Server error: ${JSON.stringify(error)}`);
        if (error.code && error.code.startsWith("ER_")) {
            logger.error(`[getBranchListService] Database error : ${JSON.stringify(error.code)}`);
            return "DatabaseError";
        }        
        return "InternalServerError";
    } finally {
        promisePool.releaseConnection();
    }
};

const getUnitListService = async (filterData) => {

    try {
       
        logger.info(
            `[getUnitListService] called with: ${JSON.stringify(
                filterData
            )}`
        );
        let query;
        let filter;

        query = `SELECT DISTINCT unit_code 
          FROM LeadDetails 
          WHERE branch_code = ?`;
        filter = [filterData.branch_code];

        
        logger.info(
            `[getUnitListService] Executing query: ${JSON.stringify(
                query.replace(/\n/g, ' ')
            )}`
        );
        logger.info(
            `[getUnitListService] Executing query Filter: ${JSON.stringify(
                filter
            )}`
        );
        // Execute the query
        const [rows] = await promisePool.execute(query, filter);
        

        if (rows.length === 0) {
            logger.warn(
                `[getUnitListService] No units found : ${""}`
            );
            return `NoCampaignsFound: ${filterData.unit_code}`;
        }

        const groups = rows.map((row, index) => ({
            id: index + 1,
            name: row.unit_code,
        }));

        // Adding the "All" option at the end
        groups.push({ id: groups.length + 1, name: "All" });

       
        return {
            data: { UnitList: groups },
        };
    } catch (error) {
        
        logger.error(`[getUnitListService] Internal Server error: ${JSON.stringify(error)}`);
        if (error.code && error.code.startsWith("ER_")) {
            logger.error(`[getUnitListService] Database error : ${JSON.stringify(error.code)}`);
            return "DatabaseError";
        }       
        return "InternalServerError";
    } finally {
        promisePool.releaseConnection();
    }
};


module.exports = {
    getReportDataService,
    getCampaignListService,
    getGroupListService,
    getBranchListService,
    getUnitListService

};