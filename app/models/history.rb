class History < ActiveRecord::Base
  belongs_to :sources
  belongs_to :topics
  belongs_to :users
end