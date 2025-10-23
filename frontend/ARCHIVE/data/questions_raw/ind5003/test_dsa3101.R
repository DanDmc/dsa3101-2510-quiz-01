library(exams)

#fnames <- sort(list.files(".", pattern="*.Rmd$"))
reg_names <- list.files(".", pattern="regression.*Rmd")[1:10]
exams2html(reg_names, n=1)

vision_names <- list.files(".", pattern="vision.*Rmd")
exams2html(vision_names, n=1)

simulation_names <- list.files(".", pattern="simulation.*Rmd")[1:10]
exams2html(simulation_names, n=1)

supervised_names <- list.files(".", pattern="supervised.*Rmd")
exams2html(supervised_names, n=1)

# practice 2410
ids <- c(2, 3,7 ,10)
vision_list <- paste0("vision_", sprintf("%02d", ids), ".Rmd")
ids <- c(4, 6, 8, 9, 11, 17, 21)
reg_list <- paste0("regression_", sprintf("%02d", ids), ".Rmd")
ids <- c(1, 2, 5, 9, 10, 13, 17)
simulation_list <- paste0("simulation_", sprintf("%02d", ids), ".Rmd")
ids <- c(1, 2, 4, 6, 8, 10, 14)
supervised_list <- paste0("supervised_", sprintf("%02d", ids), ".Rmd")

combined_list <- c(vision_list, reg_list, simulation_list, supervised_list)

exams2canvas(combined_list,  n=1)

# makeup 2410
fnames2 <- c("pandas_01.Rmd", 
             "regression_03.Rmd",
             "regression_07.Rmd",
             "regression_23.Rmd",
             "simulation_08.Rmd",
             "supervised_05.Rmd",
             "supervised_17.Rmd",
             "vision_01.Rmd",
             "vision_06.Rmd",
             "vision_11.Rmd")
exams2html(fnames2, nsamp=1, n=1)



exams2html(list("pandas_01.Rmd", 
                # "regression_01.Rmd",
                # "regression_02.Rmd",
                # "regression_03.Rmd",
                # "regression_04.Rmd",
                # "regression_05.Rmd",
                # "regression_06.Rmd",
                # "regression_07.Rmd",
                "regression_08.Rmd",
                # "regression_09.Rmd",
                # "regression_10.Rmd",
                "regression_11.Rmd"
                ), nsamp=1, n=1)

exams2html(list("simulation_01.Rmd",
                # "simulation_02.Rmd",
                # "simulation_03.Rmd",
                # "simulation_04.Rmd",
                # "simulation_05.Rmd",
                # "simulation_06.Rmd",
                # "simulation_07.Rmd",
                # "simulation_08.Rmd",
                # "simulation_09.Rmd",
                "simulation_18.Rmd",
                "simulation_19.Rmd"
                ), nsamp=1, n=1)

exams2html(list("vision_01.Rmd",
                "vision_02.Rmd",
                "vision_03.Rmd",
                "vision_04.Rmd",
                "vision_08.Rmd",
                "vision_09.Rmd"
                ), nsamp=1, n=1)

  exams2html(list("supervised_01.Rmd",
                "supervised_02.Rmd",
                "supervised_03.Rmd",
                "supervised_04.Rmd",
                "supervised_05.Rmd",
                "supervised_06.Rmd",
                "supervised_07.Rmd",
                "supervised_08.Rmd",
                "supervised_09.Rmd",
                "supervised_10.Rmd",
                "supervised_11.Rmd"
                ), nsamp=1, n=1)

#exams2canvas(list("regression_01.Rmd"), nsamp=1, n=1)



# exams2canvas(c("py_pkg_ver.Rmd", "py_stack.Rmd"),
#              nsamp=1, n=1)
# exams2qti12(c("py_pkg_ver.Rmd", "py_stack.Rmd"),
#              nsamp=1, n=1)
# exams2html(c("py_pkg_ver.Rmd", "py_stack.Rmd"),
#              nsamp=1, n=1)
# # mid-term 2320:
# fnames1 <- c("py_liv_indexing.Rmd", "py_pkg_ver.Rmd", "py_stack2.Rmd",
#              "py_wip_005.Rmd", "r_cat_or_print.Rmd", "r_hist_qq.Rmd", 
#              "r_liv_indexing.Rmd", "r_mosaic_001.Rmd", "r_wip_002.Rmd",
#              "py_chisq_001.Rmd", "py_np_matmul.Rmd", "py_recursive.Rmd",
# #             "py_wt_jacc.Rmd", "r_extract_from_list.Rmd")
#              "r_liv_gf_chart.Rmd", "r_uniroot.Rmd")
# exams2canvas(fnames1,
#              nsamp=1, n=1)
# 
# fnames2 <- c("r_rejection.Rmd", "py_l1_norm.Rmd", "py_sas_contrast.Rmd",
#              "py_sensitivity_curve.Rmd", "r_py_overview.Rmd")
# exams2html(fnames2[-2], nsamp=1, n=1)
# 
# fnames3 <- c("tf_2samp_001.Rmd", "tf_2samp_002.Rmd", "tf_2samp_003.Rmd", "tf_2samp_004.Rmd",
#              "tf_anova_005.Rmd", "tf_anova_006.Rmd", "tf_anova_007.Rmd", "tf_anova_008.Rmd",
#              "tf_sas_009.Rmd", "tf_sas_010.Rmd",
#              "tf_simulation_011.Rmd", "tf_simulation_012.Rmd", "tf_simulation_013.Rmd", "tf_simulation_014.Rmd",
#              "tf_regression_015.Rmd", "tf_regression_016.Rmd",
#              "tf_robust_017.Rmd", "tf_robust_018.Rmd", "tf_robust_019.Rmd",
#              "tf_anova_020.Rmd")
# 
# fnames_prac <- c("tf_2samp_001.Rmd", "tf_2samp_003.Rmd", "tf_anova_005.Rmd",
#                  "tf_anova_007.Rmd", "tf_sas_009.Rmd", "tf_simulation_011.Rmd",
#                  "tf_simulation_013.Rmd", "tf_regression_015.Rmd",  
#                  "tf_robust_017.Rmd", "tf_anova_020.Rmd",  
#                  "py_ts_smoothing.Rmd", "py_mc_est_e.Rmd", 
#                  "r_taiwan_anova_contrast.Rmd",
#                  "r_box_muller.Rmd", "sas_bike_interaction.Rmd")
# exams2html(fnames_prac, nsamp=1, n=1)
# 
# fnames_actual <- c("tf_2samp_002.Rmd", "tf_2samp_004.Rmd", "tf_anova_006.Rmd",
#                    "tf_anova_008.Rmd", "tf_sas_010.Rmd", "tf_simulation_012.Rmd",
#                    "tf_simulation_014.Rmd", "tf_regression_016.Rmd",
#                    "tf_robust_018.Rmd", "tf_robust_019.Rmd",
#                    "py_sensitivity_curve.Rmd",
#                    "py_agreement.Rmd",
#                    "r_inventory.Rmd", "r_taiwan_regression.Rmd")
# exams2html(fnames_actual, nsamp=1, n=1)
# exams2html(fnames_actual, nsamp=1, n=1, solution = FALSE)
# #exams2pdf(fnames_actual, nsamp=1, n=1)
# #exams2pdf("test.Rmd", nsamp=1, n=1)
# exams2canvas(fnames_prac, nsamp=1, n=1, name="final-prac-2320")
