#########    QUIZ 6 - NAIVE BAYES CLASSIFIER

banktrain <- read.csv("bank-sample.csv", header=TRUE)

dim(banktrain) # 2000 rows and 17 columns

head(banktrain) # get an idea how the data look like

# drop 6 UNNECESSARY columns for the TRANNING DATA SET:

drops <- c("balance", "day", "campaign", "pdays", "previous", "month")

banktrain <- banktrain [ , !(names(banktrain) %in% drops )]

# TESTING DATA SET

banktest <- read.csv("bank-sample-test.csv")

dim(banktest) # 100 rows and 17 columns

head(banktest) # the columns have the same names/header as in TRAIN set

# drop 6 UNNECESSARY columns for the TEST DATA SET:

banktest <- banktest[ , !( names ( banktest ) %in% drops ) ]

library(e1071)

# build the naive Bayes classifier USING THE TRAIN SET

nb_model <- naiveBayes(subscribed ~., data = banktrain) 

# in the line 32 for forming model "nb_model", we let response "subscribed" to depend on ALL THE REST COLUMNS in the data set.

# banktest has a total number of columns of banktest is 11. 
# 11th column is the LAST column which is the RESPONSE.

nb_prediction <- predict(nb_model, newdata = banktest[  , -11], type ='raw')





