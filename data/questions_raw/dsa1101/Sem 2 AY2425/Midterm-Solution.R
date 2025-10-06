

setwd("C:/Data")

setwd("~/Documents/Data")

data = read.csv("heart_disease_midterm.csv")

head(data)


# DO NOT USE THIS WAY
# data = read.csv("~/Documents/Data/heart_disease_midterm.csv") 


################   INFORMATION ABOUT THE DATASET:
# 1	Age: Patient's age in years.
# 2	Sex: Gender of the patient (1 = male, 0 = female).
# 3	Chest Pain Type (chest-pain): Indicates the type of chest pain experienced by the patient       (type 1 = high = typical angina or atypical angina which causes HIGH risk; 
#	type 0 = low = non-anginal pain or asymptomatic which causes LOW risk).
# 4	Resting Blood Pressure (bp): The patient’s resting blood pressure measured in mm Hg upon admission.
# 5	Serum Cholesterol (chol): Patient’s serum cholesterol level in mg/dl.

# 6 disease: Indicates the presence or absence of heart disease 


# Q1  (2 points) Write code to create a new column for \textbf{data}, 
# named \textbf{cp}, which equals to ``high risk'' if the person 
# has \textbf{chest.pain} of type 1, and equals to ``low risk'' if the person 
# has \textbf{chest.pain} of type 0.


data$cp = ifelse(data$chest.pain == 1,  "high risk", "low risk")



# Q2  (2 points) Write code to change the labels for \textbf{sex} where 
# 1 is replaced by ``\textbf{male}'' and 0 is replaced by ``\textbf{female}''.

data$sex = ifelse(data$sex == 1,  "male", "female")



# Q3  (2 points) Write code to create a table of proportions for the 
# response column, \textbf{disease}. 
# Report the percentage of people that have heart disease.

prop.table( table(data$disease) ) * 100 
# 46% had heart disease



# Q4  (2 points) Write code to create a QQ plot for the sample of 
# cholesterol level, \textbf{chol}. Give your comments.

qqnorm(data$chol, pch = 20)
qqline(data$chol, col = "red") 

# Comments:left tail is quite normal but RIGHT tail is LONGER than normal.
# The sample of cholesterol is not normal.



# Q5  (2 points) Write code to create box plots of people's age by groups 
# of heart disease status. Give your comments.

boxplot(data$age ~ data$disease)

# comments: The group of people with disease has HIGHER AGE MEDIAN than
# the group of people without disease.
# possible association: older age might easier get heart disease.



# Q6  (2 points) Create a contingency table (named \textbf{tab1}) for 
# \textbf{cp} and \textbf{disease}. Report the number of people that 
# have high risk type of chest pain and also have heart disease.

tab1 = table(data$cp, data$disease); tab1

# 113 people


# Q7  (4 points) Using \textbf{tab1}, write one command in R to find the two probabilities below. 
# (i) the probability of having heart disease in the group of people having high risk type of chest pain.%, denoted as $\boldsymbol{p_1}$; 
# (ii) the probability of having heart disease in the group of people having low risk type of chest pain.%, denoted as $\boldsymbol{p_2}$.
# Report the difference of the two probabilities above and interpret the meaning of that difference.


prop.table(tab1, 1)
#                   no       yes
#  high risk 0.4114583 0.5885417
#  low risk  0.7685185 0.2314815

# percentage of having disease in the group of people with chest pain type 1 = high risk is p1 = 0.5888
# which is  higher than that among the gorup people with chest pain of type 0 = low risk, p2 = 0.2314815.
# difference = 0.5888 - 0.2315 = 0.3573

# comments on the difference: the large difference suggests possible strong association between the type 
# of chest pain and the chance of having disease, that the HIGH-RISK type may cause much higher
# chance of having HD.


# Q8  (4 points) Find the odds ratio for \textbf{tab1} and interpret it.

OR = (79*25)/(113*83); OR # 0.21 or 4.75 = (113*83)/(79*25)

# OR = 0.21 means: the odds of NOT having HD among people with chest pain type 1 = high risk is 0.21 times 
# the odds of NOT having HD among people with chest pain type 0 = low risk.

# OR = 4.75 means: the odds of NOT having HD among people with chest pain type 0 = low is 4.75 times 
# the odds of NOT having HD among people with chest pain type 1 = high. 

# Equivalently: the odds of having HD among people with chest pain type 1 = high is 4.75 times 
# the odds of having HD among people with chest pain type 0 = low. 






################ PART 2: KNN (20 points)
# For the questions in this Part II, we would want to form KNN classifiers 
# using input features \textbf{age}, \textbf{chest.pain}, \textbf{bp} and \textbf{chol} 
# which help to predict if a person has heart disease.
# We hence will consider \textbf{chest.pain} with 0, 1 as a numeric variable.


# Q9  (2 points) Write code to create a new data frame, called \textbf{data.KNN} 
# which has five columns: \textbf{age}, \textbf{chest.pain}, \textbf{bp} and 
# \textbf{chol} after standardization for all observations; 
# and the $5^{th}$ column is the column of the response, \textbf{disease}.

head(data)

data.KNN = data[ , c(1,3,4,5,6)]

head(data.KNN)

data.KNN[ ,1:4] = scale(data.KNN[ ,1:4])

head(data.KNN)


# Q10  (4 points) Run the command \textbf{set.seed(703)}. 
# Then, write code to randomly split \textbf{data.KNN} into two groups: 
# one group has 240 rows (will be the train set), named as \textbf{train.set} 
# and other group has the rest of rows (will be the test set), named as \textbf{test.set}.


n = dim(data)[1]

set.seed(703)

index = sample(1:n) # 

# index[1:240]

data.train = data.KNN[index[1:240], ]
data.test = data.KNN[-index[1:240], ]




# Q11  (6 points) Use the train set with four standardized features 
# to form the KNN classifiers where $\boldsymbol{k} = 3, 5, 7, 9, 11, 13, 15$, 
# and TPR value for each classifier is kept in a vector named \textbf{tpr}. \label{knn}

library(class)

K = c(3, 5, 7, 9, 11, 13, 15) 
# length(K) = 7

tpr= numeric()

for (i in K){ 
  
  pred <- knn(train=data.train[ ,1:4], test=data.test[ ,1:4], cl=data.train[ ,5], k=i)
  # KNN with k receiving value in vector K
  
  confusion.matrix = table(data.test[ ,5], pred) # confusion.matrix
  
  true.PR = confusion.matrix[2,2]/sum(confusion.matrix[2,2], confusion.matrix[2,1])
  
  tpr = append(tpr, true.PR )
  
  
}

tpr
# [1] 0.4444444 0.4814815 0.4444444 0.4074074 0.4444444 0.4444444 0.4444444



# Q12  (2 points) Using True Positive Rate (TPR) as the criterion, 
# write code to find the best $\boldsymbol{k}$ found and report the value of TPR of
# the KNN classifier with that value of $\boldsymbol{k}$. 

plot(K, tpr, xlab = "k", ylab = "True Positive Rate", pch = 20, col = "red", type = "l")
# this plot is optinal

cbind(K, tpr) 
# this helps to visualize which value of k gives highest tpr

# Report: k = 5 is the best with highest TPR




# Q13   (6 points) Use the KNN with the best \textbf{k} found in Question \ref{bestk} to 
# predict the disease status of a female at age 60, having high risk type of chest pain,  
# with information listed below. \label{newpoint}
# \textbf{age} = 60, \textbf{sex} = female, \textbf{chest.pain} = 1, \textbf{bp} = 160, \textbf{chol} = 200.

# GET THE MEAN AND SD OF EACH COLUMN IN original data[, c(1,3,4,5)] SO THAT WE CAN STANDARDIZE NEW POINT

new = data.frame(age = 60, sex = "female", chest.pain = 1, bp = 160, chol = 200) 

# new = data.frame(age = 20, sex = "female", chest.pain = 0, bp = 100, chol = 200) 



head(data)

mean = colMeans(data[ , c(1,3,4,5)]) ; mean

# mean of each column in the orignal data of 300 points
#       age chest.pain         bp       chol 
#  54.41333    0.64000  131.72000  245.97667 


sd = apply(X = data[ , c(1,3,4,5)] , FUN = sd, MARGIN  = 2) ; sd
# sd of each column in the orignal data of 300 points
#       age chest.pain         bp       chol 
#  9.047394   0.480802  17.593941  51.568730 


# Standardize the new point: columns 1, 3, 4, 5 only (not taking column 2 = sex)

scale = (new[ 1 , c(1,3,4,5)] - mean)/sd ; scale

#      age chest.pain       bp      chol
# 0.617489   0.748749 1.607372 -0.891561




# AFTER STANDARDIZE THE NEW POINT,
# APPLY KNN with k = 5, TO PREDICT THE RESPONSE FOR new point

knn(train = data.train[ ,1:4], test = scale, cl = data.train[ ,5], k=5 , prob = TRUE) 

# REPORT: new person is predicted as "Yes" = having heart disease. 



#################. PART III - DECISION TREE

library(rpart)
library(rpart.plot)

# For the questions in this Part III, we would want to form a decision tree 
# which helps to predict heart disease status, using the full data set given 
# and all 5 input features \textbf{age}, \textbf{sex}, \textbf{bp}, \textbf{chol}, 
# and either \textbf{chest.pain} or \textbf{cp}.

# Q14 (4 points) Write code to form a decision tree, named \textbf{DT}, 
# to predict the heart disease status with \texttt{maxdepth = 3}, 
# where variable selection and split points are based on Information Gain.
# How many input features are shown in the fitted tree? 
# Among all the features shown in that tree, which one is the most important 
# in predicting the disease status?

#: DT with maxdepth = 3, Information Gain

DT <- rpart(disease ~ age + sex + bp + chol + chest.pain,
            method = "class", data = data, control = rpart.control(maxdepth = 3),
            parms = list( split ='information'))


rpart.plot(DT, type=4, extra=2, varlen=0, faclen=0, clip.right.labs=FALSE)

# 3 features shown: chest.pain; sex; and age.
# most important is the type of chest pain

# Q15 (2 points) Consider the person with information listed in Question~\ref{newpoint}. 
# Using the tree \textbf{DT} formed above, report the predicted probability that 
# the person will have heart disease.

predict(DT, new, type = "prob") # 0.7008547 = 82/117

# or by looking at the tree, can see the probability as 82/117 (bottom right leaf node).


# Q16 (4 points) Use \texttt{predict()} function in R, 
# write code to find the TPR of the tree \textbf{DT} for its prediction 
# for all the points in \textbf{data}.

head(data)


pred.dt = predict(DT , new.data = data[ , 1:5], type='class')

# data.frame(pred.dt, data[ , 6] )

tab = table( data[ , 6], pred.dt ); tab

TPR = tab[2,2]/sum(tab[2,2], tab[2,1]); TPR

# TPR = 0.92753





########### QUESTION 2 = TOTAL WORTH 10 POINTS


# General idea: Joshua Lee currently is working for a company. 
# Currrently, in March 2025, his monthly salary is 8k and is increased 5% from 01 January very year.

# So far, until end of March 2025, he has a saving amount of 60k.

# However, he wants to form a start-up company which will requires an initial amount of 150k. 

# Define a function in R, named \textbf{F}, which helps to calculate the number 
# of months (counting from 01 Apr 2025) that Joshua Lee could save up enough money 
# to start the company.



####### SIMLAR AS TUTORIAL 1, WE DEFINE A FUNCTION THAT HELPS TO CALCULATE THE NUMBER OF MONTHS
####### THAT HELPS TO SAVE ENOUGH MONEY 

# FIRST METHOD:

# Amount of saving from April untill end of Dec 2025 (9 months) is:

saved = 60000 + 9*8000*0.4 # 9 months from April to Dec of 2025 IS = 88800
saved

rate = 0.05 # rate of salary increasing yearly

portion_save = 0.4 # portion of saving monthly


month = 0 # starting to count from Jan 2026

F = function(salary){
  
  while(saved < 150000 ) {
    month = month + 1
    
    if (month%%12 ==1){salary = salary*(1+rate)}
    # MUST INCREASE AT THE START of each year, from Jan 2026

    saved = saved + portion_save *salary
    
    print(c(saved, salary, month) )
    
  }
  return(month + 9) # adding 9 months from Apr to Dec 2025 
}

F(salary = 8000) 

# Total:  = 27 months





# SECOND METHOD


F = function(salary) { 
  savings = 60000;
  current_month = 4; # current month of a year, starting is April 2025
  months = 0 # to count the number of months
  
  while(savings < 150000) {
    months = months + 1
    savings = savings + salary * 0.4
    
    current_month = (current_month + 1)
    if (current_month == 13) { 
      current_month = 1 # when current_month = 13, move it to next year, start from Jan = 1.
      salary = salary * 1.05
    }
  }
  
  return(months)
  
}

F(8000) # 27 months















