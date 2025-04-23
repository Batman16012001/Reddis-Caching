const { promisePool } = require('../config/mysqlDB');
const logger = require("../utils/logger");
const CacheUtils = require('../utils/cacheUtils');

const getDashboadCampaignListService = async (filterData) => {
    const { start_date, end_date, status, user_id, campaign_name } = filterData;
   
    logger.info(
        `[getDashboadCampaignListService] called with: ${JSON.stringify(
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

        if (user_id && user_id !== '') {
            query += ` AND created_by = ?`;
            params.push(user_id);
        }
        logger.info(
            `[getDashboadCampaignListService] execeute query: ${JSON.stringify(
                query.replace(/\n/g, ' ')
            )}`
        );
        logger.info(
            `[getDashboadCampaignListService] execeute query params: ${JSON.stringify(
                params
            )}`
        );
        const [rows] = await promisePool.execute(query, params);

        if (rows.length === 0) {
            
            logger.warn(
                `[getDashboadCampaignListService] No campaigns found : ${""}`
            );
            return `NoCampaignsFound: ${campaign_name}`;
        }

        return {
            data: { CampaignList: rows }
        };

    } catch (error) {      
       logger.error(`[getDashboadCampaignListService] Internal Server error: ${JSON.stringify(error)}`);
       if (error.code && error.code.startsWith("ER_")) {          
           logger.error(`[getDashboadCampaignListService] Database error : ${JSON.stringify(error.code)}`);
           return "DatabaseError";
       }       
       return "InternalServerError";
    } finally {
        promisePool.releaseConnection();
    }
};


//This will update later
const getLeadLocationService = async (filterData) => {


    try {
        
        logger.info(
            `[getLeadLocationService] called with: ${JSON.stringify(
                filterData
            )}`
        );

       
        const query = `SELECT 
                        c.campaign_name, 
                        l.district,
                        COUNT(DISTINCT l.lead_id) AS total_leads    
                        FROM LeadDetails l
                        JOIN CampaignDetails c ON l.campaign_id = c.campaign_id
                        WHERE (c.creation_date BETWEEN ? AND ? OR c.campaign_id IS NULL)  
                        AND (? = 'All' OR c.campaign_id = ?)
                        AND (? = 'All' OR c.status= ? )
                        GROUP BY c.campaign_name, l.district
                        ORDER BY total_leads DESC;  `
        

        // Execute the query
        const filter = [filterData.start_date, filterData.end_date, filterData.campaign_name, filterData.campaign_name, filterData.status, filterData.status]
        logger.info(
            `[getLeadLocationService] execeute query: ${JSON.stringify(
                query.replace(/\n/g, ' ')
            )}`
        );
        logger.info(
            `[getLeadLocationService] execeute query params: ${JSON.stringify(
                filter
            )}`
        );
        
        const [rows] = await promisePool.execute(query, filter);

        

        if (rows.length === 0) {
            
            logger.warn(
                `[getLeadLocationService] No leads found : ${""}`
            );
            return `NoCampaignsFound: ${filterData.campaign_name}`;
        }

        
        return {
            data: { CampaignList: rows }
        };

    } catch (error) {
        logger.error(`[getLeadLocationService] Internal Server error: ${JSON.stringify(error)}`);
        if (error.code && error.code.startsWith("ER_")) {          
            logger.error(`[getLeadLocationService] Database error : ${JSON.stringify(error.code)}`);
            return "DatabaseError";
        }       
        return "InternalServerError";
    }
    finally {
        promisePool.releaseConnection();
    }
};



const getDashboardDataService = async (filterData) => {
    const { start_date, end_date, campaign_name, district, status, user_id } = filterData;
    const hasUserId = user_id && user_id !== 'All';

    logger.info(
        `[getDashboardDataService] called with: ${JSON.stringify(filterData)}`
    );

    try {
        // Generate cache key based on filter parameters
        const cacheKey = CacheUtils.generateCacheKey('dashboard_data', filterData);
        
        // Try to get data from cache
        const cachedData = await CacheUtils.getCache(cacheKey);
        if (cachedData) {
            logger.info(`[getDashboardDataService] Cache hit for key: ${cacheKey}`);
            await CacheUtils.trackQueryUsage(cacheKey);
            return cachedData;
        }

        logger.info(`[getDashboardDataService] Cache miss for key: ${cacheKey}`);

        const { start_date, end_date, campaign_name, status, user_id } = filterData;
        const hasUserId = user_id && user_id !== '';

        logger.info(
            `[getDashboardDataService] called with: ${JSON.stringify(
                filterData
            )}`
        );

        // campaignWiseSQL Start
        let campaignWiseSQL = `
            SELECT 
                c.campaign_name,
                c.campaign_id,
                COUNT(DISTINCT l.lead_id) AS total_leads, 
                SUM(CASE WHEN l.current_stage = 'Proposal' THEN 1 ELSE 0 END) AS total_policies,
                50 as total_mcfp
            FROM LeadDetails l
            JOIN CampaignDetails c ON l.campaign_id = c.campaign_id
            WHERE c.creation_date BETWEEN ? AND ?
            AND (? = 'All' OR c.campaign_id = ?)
            AND (? = 'All' OR c.status = ?)`;

        const campaignWiseFilter = [start_date, end_date, campaign_name, campaign_name, status, status];

        if (hasUserId) {
            campaignWiseSQL += ` AND c.created_by = ?`;
            campaignWiseFilter.push(user_id);
        }

        campaignWiseSQL += ` GROUP BY c.campaign_id, c.campaign_name
            ORDER BY total_leads DESC`;

            logger.info(
                `[getDashboardDataService] CampaignWise SQL: ${JSON.stringify(
                    campaignWiseSQL.replace(/\n/g, ' ')
                )}`
            );
            logger.info(
                `[getDashboardDataService] CampaignWise SQL Filter: ${JSON.stringify(
                    campaignWiseFilter
                )}`
            );
        //branchWiseSQL Start

        let branchWiseSQL = `
            SELECT 
                l.district,
                l.branch_code,
                COUNT(DISTINCT l.lead_id) AS leadCount
            FROM LeadDetails l
            JOIN CampaignDetails c ON l.campaign_id = c.campaign_id
            WHERE c.creation_date BETWEEN ? AND ?
              AND (? = 'All' OR c.campaign_id = ?)
              AND (? = 'All' OR l.district = ?)
              AND (? = 'All' OR c.status = ?)
        `;

        const branchWiseFilter = [start_date, end_date, campaign_name, campaign_name, district, district, status, status];

        if (hasUserId) {
            branchWiseSQL += ` AND c.created_by = ?`;
            branchWiseFilter.push(user_id);
        }

        branchWiseSQL += ` GROUP BY l.district, l.branch_code
        ORDER BY leadCount DESC`;
        logger.info(
            `[getDashboardDataService] branchWise SQL: ${JSON.stringify(
                branchWiseSQL.replace(/\n/g, ' ')
            )}`
        );
        logger.info(
            `[getDashboardDataService] branchWise SQL Filter: ${JSON.stringify(
                branchWiseFilter
            )}`
        );

        //leadStagesCountSQL Start
        let leadStagesCountSQL = `
        SELECT 
            c.campaign_name, 
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
        WHERE c.creation_date BETWEEN ? AND ?
          AND (? = 'All' OR c.campaign_id = ?)
          AND (? = 'All' OR c.status = ?)
    `;

        const leadStagesCountfilter = [start_date, end_date, campaign_name, campaign_name, status, status];

        if (hasUserId) {
            leadStagesCountSQL += ` AND c.created_by = ?`;
            leadStagesCountfilter.push(user_id);
        }

        leadStagesCountSQL += ` GROUP BY c.campaign_name
    ORDER BY Total_Leads DESC`;
    logger.info(
        `[getDashboardDataService] leadStagesCount SQL: ${JSON.stringify(
            leadStagesCountSQL.replace(/\n/g, ' ')
        )}`
    );
    logger.info(
        `[getDashboardDataService] leadStagesCount SQL Filter: ${JSON.stringify(
            leadStagesCountfilter
        )}`
    );
        //END
        //branchPerformanceSQL start
        let branchPerformanceSQL = `
            SELECT         
                l.branch_code,    
                COUNT(DISTINCT CASE WHEN l.user_type = 'UNITHEAD' THEN l.lead_id END) AS UnitHead_LeadCount,
                COUNT(DISTINCT CASE WHEN l.user_type = 'SC' THEN l.lead_id END) AS LIA_LeadCount,
                COUNT(DISTINCT CASE WHEN l.user_type = 'HOB' THEN l.lead_id END) AS HOB_LeadCount,
                COUNT(DISTINCT l.lead_id) AS TotalLeadCount  
            FROM LeadDetails l
            JOIN CampaignDetails c ON l.campaign_id = c.campaign_id
            WHERE c.creation_date BETWEEN ? AND ?
            AND (? = 'All' OR c.campaign_id = ?)
            AND (? = 'All' OR c.status = ?)
        `;

        const branchPerformanceFilter = [start_date, end_date, campaign_name, campaign_name, status, status];

        if (hasUserId) {
            branchPerformanceSQL += ` AND c.created_by = ?`;
            branchPerformanceFilter.push(user_id);
        }

        branchPerformanceSQL += ` GROUP BY l.branch_code
        ORDER BY TotalLeadCount DESC LIMIT 5`;

        logger.info(
            `[getDashboardDataService] branchPerformance SQL: ${JSON.stringify(
                branchPerformanceSQL.replace(/\n/g, ' ')
            )}`
        );
        logger.info(
            `[getDashboardDataService] branchPerformance SQL Filter: ${JSON.stringify(
                branchPerformanceFilter
            )}`
        );

        //END
        //Start leadSourceScoreSQL
        let leadSourceScoreSQL = `
        SELECT 
            l.lead_source,
            COUNT(DISTINCT l.lead_id) AS total_leads,
            ROUND((COUNT(DISTINCT l.lead_id) * 100.0) / SUM(COUNT(DISTINCT l.lead_id)) OVER (), 2) AS lead_percentage
        FROM LeadDetails l
        JOIN CampaignDetails c ON l.campaign_id = c.campaign_id
        WHERE c.creation_date BETWEEN ? AND ?
          AND (? = 'All' OR c.campaign_id = ?)
          AND (? = 'All' OR c.status = ?)
          AND l.lead_source IS NOT NULL
    `;

        const leadSourceScoreFilter = [start_date, end_date, campaign_name, campaign_name, status, status];

        if (hasUserId) {
            leadSourceScoreSQL += ` AND c.created_by = ?`;
            leadSourceScoreFilter.push(user_id);
        }

        leadSourceScoreSQL += `
        GROUP BY l.lead_source
        ORDER BY total_leads DESC`;
        logger.info(
            `[getDashboardDataService] leadSourceScore SQL: ${JSON.stringify(
                leadSourceScoreSQL.replace(/\n/g, ' ')
            )}`
        );
        logger.info(
            `[getDashboardDataService] leadSourceScore SQL Filter: ${JSON.stringify(
                leadSourceScoreFilter
            )}`
        );
        //Start budgetSQL
        let budgetSQL = `
        SELECT 
            COUNT(l.lead_id) AS Grand_Total_Leads, 
            (
                SELECT COALESCE(SUM(campaign_cost), 0)
                FROM CampaignDetails 
                WHERE creation_date BETWEEN ? AND ?
                  AND (? = 'All' OR campaign_id = ?)
                  AND (? = 'All' OR status = ?)
                  ${hasUserId ? 'AND created_by = ?' : ''}
            ) AS Total_Campaign_Cost
        FROM LeadDetails l  
        JOIN CampaignDetails c ON l.campaign_id = c.campaign_id 
        WHERE c.creation_date BETWEEN ? AND ?
          AND (? = 'All' OR c.campaign_id = ?)
          AND (? = 'All' OR c.status = ?)
          ${hasUserId ? 'AND c.created_by = ?' : ''}
    `;
    
    const budgetFilter = [
        start_date, end_date, campaign_name, campaign_name, status, status,
        ...(hasUserId ? [user_id] : []), // for subquery
        start_date, end_date, campaign_name, campaign_name, status, status,
        ...(hasUserId ? [user_id] : [])  // for main query
    ];

        logger.info(
            `[getDashboardDataService] budget SQL: ${JSON.stringify(
                budgetSQL.replace(/\n/g, ' ')
            )}`
        );

        logger.info(
            `[getDashboardDataService] budget SQL Filter : ${JSON.stringify(
                budgetFilter
            )}`
        );
        //End budgetSQL
        const queries = [promisePool.execute(campaignWiseSQL, campaignWiseFilter),
        promisePool.execute(branchWiseSQL, branchWiseFilter),
        promisePool.execute(leadStagesCountSQL, leadStagesCountfilter),
        promisePool.execute(branchPerformanceSQL, branchPerformanceFilter),
        promisePool.execute(leadSourceScoreSQL, leadSourceScoreFilter),
        promisePool.execute(budgetSQL, budgetFilter)
        ]
        const [campaignWiseResult, branchWiseResult, leadStagesCountResult, branchPerformanceResult, leadSourceScoreResult, budgetResult] = await Promise.all(queries);

        let dashboardOutput = {
            campaignWiseResult: campaignWiseResult[0],
            branchWiseResult: branchWiseResult[0],
            leadStagesCountResult: leadStagesCountResult[0],
            branchPerformanceResult: branchPerformanceResult[0],
            leadSourceScoreResult: leadSourceScoreResult[0],
            budgetResult: budgetResult[0]
        };

        // Cache the result
        await CacheUtils.setCache(cacheKey, { data: dashboardOutput });

        return {
            data: dashboardOutput
        };

    } catch (error) {
        logger.error(`[getDashboardDataService] Internal Server error: ${JSON.stringify(error)}`);
        if (error.code && error.code.startsWith("ER_")) {          
            logger.error(`[getDashboardDataService] Database error : ${JSON.stringify(error.code)}`);
            return "DatabaseError";
        }       
        return "InternalServerError";
    } finally {
        promisePool.releaseConnection();
    }
};



module.exports = {

    getDashboadCampaignListService,
    getLeadLocationService,
    getDashboardDataService
};
